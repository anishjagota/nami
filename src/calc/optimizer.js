/**
 * Nami Portfolio Optimizer
 * 
 * Implements three optimization strategies following the empirical finance reference:
 * 
 * 1. Minimum Variance (Safer Version)
 *    Reference: OptPort.m lines 17-27
 *    minimize w'Σw subject to Σw=1, 0≤w≤1
 * 
 * 2. Maximum Sharpe (Efficiency-Focused)
 *    Reference: OptPort.m lines 19-28
 *    minimize w'Σw subject to μ'w≥r, Σw=1, 0≤w≤1
 *    Search over r to find tangency portfolio
 * 
 * 3. Risk Parity (Balanced Version)
 *    Reference: OptRP.m
 *    minimize Σ(RC_i - σ_p/k)² subject to Σw=1, w≥0
 */

import {
  portfolioVariance,
  portfolioVolatility,
  portfolioReturn,
  matrixVectorMultiply,
  dotProduct,
} from './statistics';
import { RISK_FREE_RATE, MONTHS_PER_YEAR } from '../config/constants';

// Optimization parameters
const MAX_ITERATIONS = 2000;
const TOLERANCE = 1e-10;

/**
 * ============================================================================
 * QUADRATIC PROGRAMMING SOLVER
 * ============================================================================
 * 
 * Solves: minimize (1/2) x'Hx + f'x
 * subject to: Aeq * x = beq
 *             Aineq * x <= bineq
 *             lb <= x <= ub
 * 
 * Uses active-set method with projected gradient iterations.
 */

/**
 * Solve equality-constrained QP using null-space method
 * minimize (1/2) x'Hx subject to Aeq*x = beq
 * 
 * For our case: Aeq = [1,1,...,1], beq = [1]
 * This means we're on the simplex hyperplane.
 */
function solveEqualityConstrainedQP(H, Aeq, beq) {
  const n = H.length;
  
  // For the simple case of sum(w) = 1, we can use Lagrangian approach
  // L = (1/2)w'Hw - λ(1'w - 1)
  // ∇L = Hw - λ1 = 0  =>  w = λH^(-1)1
  // 1'w = 1  =>  λ = 1 / (1'H^(-1)1)
  
  // Solve H*w = 1 (vector of ones)
  const ones = Array(n).fill(1);
  const Hinv_ones = solveLinearSystem(H, ones);
  
  if (!Hinv_ones) {
    // Fallback to equal weights if system is singular
    return Array(n).fill(1 / n);
  }
  
  // λ = 1 / (1'H^(-1)1)
  const lambda = 1 / Hinv_ones.reduce((s, v) => s + v, 0);
  
  // w = λ * H^(-1)1
  return Hinv_ones.map(v => v * lambda);
}

/**
 * Solve linear system Ax = b using Gaussian elimination with partial pivoting
 */
function solveLinearSystem(A, b) {
  const n = A.length;
  
  // Create augmented matrix
  const aug = A.map((row, i) => [...row, b[i]]);
  
  // Forward elimination with partial pivoting
  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }
    
    // Swap rows
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    
    // Check for singular matrix
    if (Math.abs(aug[col][col]) < 1e-12) {
      return null;
    }
    
    // Eliminate column
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }
  
  // Back substitution
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= aug[i][j] * x[j];
    }
    x[i] /= aug[i][i];
  }
  
  return x;
}

/**
 * Project vector onto the feasible region: sum=1, lb<=x<=ub
 * Uses iterative clipping and rescaling
 */
function projectToFeasibleRegion(x, lb, ub) {
  const n = x.length;
  let w = [...x];
  
  for (let iter = 0; iter < 100; iter++) {
    // Clip to bounds
    let sumFree = 0;
    let numFree = 0;
    let sumFixed = 0;
    const atBound = [];
    
    for (let i = 0; i < n; i++) {
      if (w[i] <= lb[i] + TOLERANCE) {
        w[i] = lb[i];
        sumFixed += lb[i];
        atBound[i] = 'lower';
      } else if (w[i] >= ub[i] - TOLERANCE) {
        w[i] = ub[i];
        sumFixed += ub[i];
        atBound[i] = 'upper';
      } else {
        sumFree += w[i];
        numFree++;
        atBound[i] = null;
      }
    }
    
    // Rescale free variables to make sum = 1
    const targetFree = 1 - sumFixed;
    
    if (numFree === 0) {
      // All at bounds - check if feasible
      const sum = w.reduce((s, v) => s + v, 0);
      if (Math.abs(sum - 1) < TOLERANCE) break;
      // Not feasible - fall back to simple projection
      return projectToSimplexSimple(x, lb, ub);
    }
    
    if (Math.abs(sumFree) < TOLERANCE) {
      // Free weights sum to zero - distribute evenly
      for (let i = 0; i < n; i++) {
        if (atBound[i] === null) {
          w[i] = targetFree / numFree;
        }
      }
    } else {
      // Scale free weights
      const scale = targetFree / sumFree;
      for (let i = 0; i < n; i++) {
        if (atBound[i] === null) {
          w[i] *= scale;
        }
      }
    }
    
    // Check convergence
    const sum = w.reduce((s, v) => s + v, 0);
    const allInBounds = w.every((v, i) => v >= lb[i] - TOLERANCE && v <= ub[i] + TOLERANCE);
    if (Math.abs(sum - 1) < TOLERANCE && allInBounds) break;
  }
  
  // Final cleanup
  return w.map((v, i) => Math.max(lb[i], Math.min(ub[i], v)));
}

/**
 * Simple simplex projection for fallback
 */
function projectToSimplexSimple(x, lb, ub) {
  const n = x.length;
  let w = x.map((v, i) => Math.max(lb[i], Math.min(ub[i], v)));
  
  // Normalize to sum to 1
  const sum = w.reduce((s, v) => s + v, 0);
  if (sum > 0) {
    w = w.map(v => v / sum);
  } else {
    w = Array(n).fill(1 / n);
  }
  
  // Re-clip after normalization
  w = w.map((v, i) => Math.max(lb[i], Math.min(ub[i], v)));
  
  // Renormalize
  const sum2 = w.reduce((s, v) => s + v, 0);
  if (Math.abs(sum2 - 1) > TOLERANCE && sum2 > 0) {
    w = w.map(v => v / sum2);
  }
  
  return w;
}

/**
 * Solve box-constrained QP with equality constraint sum(w) = 1
 * minimize (1/2) w'Hw
 * subject to: 1'w = 1, lb <= w <= ub
 * 
 * Uses projected gradient descent with active set management
 */
function solveBoxConstrainedQP(H, lb, ub, initialWeights = null) {
  const n = H.length;
  
  // Initialize
  let w = initialWeights ? [...initialWeights] : Array(n).fill(1 / n);
  w = projectToFeasibleRegion(w, lb, ub);
  
  let learningRate = 0.1;
  let prevObjective = Infinity;
  
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // Compute gradient: ∇(w'Hw) = 2Hw
    const grad = matrixVectorMultiply(H, w).map(g => 2 * g);
    
    // Project gradient onto constraint manifold (subtract mean to maintain sum=1)
    const meanGrad = grad.reduce((s, g) => s + g, 0) / n;
    const projGrad = grad.map(g => g - meanGrad);
    
    // Line search with Armijo condition
    let step = learningRate;
    const currentObj = computeQuadraticObjective(H, w);
    
    for (let ls = 0; ls < 20; ls++) {
      const wNew = w.map((wi, i) => wi - step * projGrad[i]);
      const wProj = projectToFeasibleRegion(wNew, lb, ub);
      const newObj = computeQuadraticObjective(H, wProj);
      
      if (newObj < currentObj - 1e-4 * step * dotProduct(projGrad, projGrad)) {
        w = wProj;
        break;
      }
      step *= 0.5;
      
      if (ls === 19) {
        // Very small step - apply anyway
        w = projectToFeasibleRegion(wNew, lb, ub);
      }
    }
    
    // Check convergence
    const objective = computeQuadraticObjective(H, w);
    const gradNorm = Math.sqrt(projGrad.reduce((s, g) => s + g * g, 0));
    
    if (gradNorm < TOLERANCE || Math.abs(prevObjective - objective) < TOLERANCE) {
      break;
    }
    
    prevObjective = objective;
    
    // Adaptive learning rate
    if (iter % 100 === 0 && iter > 0) {
      learningRate *= 0.9;
    }
  }
  
  return w;
}

/**
 * Compute quadratic objective: (1/2) w'Hw
 */
function computeQuadraticObjective(H, w) {
  const Hw = matrixVectorMultiply(H, w);
  return 0.5 * dotProduct(w, Hw);
}

/**
 * Solve QP with inequality constraint on return
 * minimize (1/2) w'Hw
 * subject to: μ'w >= r (return floor)
 *             1'w = 1
 *             lb <= w <= ub
 */
function solveQPWithReturnConstraint(H, mu, targetReturn, lb, ub) {
  const n = H.length;
  
  // Initialize with equal weights
  let w = Array(n).fill(1 / n);
  w = projectToFeasibleRegion(w, lb, ub);
  
  // Check if constraint is satisfiable
  const maxReturn = Math.max(...mu);
  if (targetReturn > maxReturn + TOLERANCE) {
    return null; // Infeasible
  }
  
  // Penalty method: minimize w'Hw + penalty * max(0, r - μ'w)²
  let penalty = 1;
  const maxPenalty = 1e8;
  
  for (let outer = 0; outer < 20; outer++) {
    let learningRate = 0.05;
    
    for (let iter = 0; iter < MAX_ITERATIONS / 20; iter++) {
      // Gradient of w'Hw
      const gradQuad = matrixVectorMultiply(H, w).map(g => 2 * g);
      
      // Gradient of penalty term
      const currentReturn = dotProduct(mu, w);
      const violation = targetReturn - currentReturn;
      
      let gradPenalty;
      if (violation > 0) {
        // Constraint violated: gradient of penalty * violation²
        // d/dw [penalty * (r - μ'w)²] = -2 * penalty * (r - μ'w) * μ
        gradPenalty = mu.map(m => -2 * penalty * violation * m);
      } else {
        gradPenalty = Array(n).fill(0);
      }
      
      // Total gradient
      const grad = gradQuad.map((g, i) => g + gradPenalty[i]);
      
      // Project gradient
      const meanGrad = grad.reduce((s, g) => s + g, 0) / n;
      const projGrad = grad.map(g => g - meanGrad);
      
      // Update
      const wNew = w.map((wi, i) => wi - learningRate * projGrad[i]);
      w = projectToFeasibleRegion(wNew, lb, ub);
      
      // Check inner convergence
      const gradNorm = Math.sqrt(projGrad.reduce((s, g) => s + g * g, 0));
      if (gradNorm < TOLERANCE * 10) break;
      
      learningRate *= 0.995;
    }
    
    // Check constraint satisfaction
    const finalReturn = dotProduct(mu, w);
    if (finalReturn >= targetReturn - TOLERANCE) {
      break;
    }
    
    // Increase penalty
    penalty = Math.min(penalty * 10, maxPenalty);
  }
  
  return w;
}


/**
 * ============================================================================
 * MINIMUM VARIANCE PORTFOLIO
 * ============================================================================
 * 
 * Reference: OptPort.m lines 17-27
 * 
 * minimize:    w'Σw
 * subject to:  Σw_i = 1
 *              0 ≤ w_i ≤ 1  ∀i
 */
export function minimumVariance(covMatrix, minWeight = 0, maxWeight = 1) {
  const n = covMatrix.length;
  const lb = Array(n).fill(minWeight);
  const ub = Array(n).fill(maxWeight);
  
  // First try unconstrained solution (equality only)
  const wUnconstrained = solveEqualityConstrainedQP(covMatrix, [Array(n).fill(1)], [1]);
  
  // Check if unconstrained solution satisfies bounds
  const inBounds = wUnconstrained && wUnconstrained.every((w, i) => w >= lb[i] - TOLERANCE && w <= ub[i] + TOLERANCE);
  
  if (inBounds) {
    // Unconstrained solution is feasible - clean up numerical noise
    return wUnconstrained.map((w, i) => Math.max(lb[i], Math.min(ub[i], w)));
  }
  
  // Need to solve box-constrained problem
  return solveBoxConstrainedQP(covMatrix, lb, ub, wUnconstrained);
}


/**
 * ============================================================================
 * MAXIMUM SHARPE PORTFOLIO
 * ============================================================================
 * 
 * Reference: OptPort.m lines 19-28
 * 
 * The reference uses quadprog with a return floor constraint:
 *   minimize:    w'Σw
 *   subject to:  μ'w ≥ r
 *                Σw_i = 1
 *                0 ≤ w_i ≤ 1
 * 
 * The max Sharpe portfolio is found by searching over r values.
 */
export function maximumSharpe(covMatrix, expectedReturns, riskFreeRate = RISK_FREE_RATE) {
  const n = covMatrix.length;
  const rf_monthly = Math.pow(1 + riskFreeRate, 1 / MONTHS_PER_YEAR) - 1;
  
  const lb = Array(n).fill(0);
  const ub = Array(n).fill(1);
  
  // Find feasible return range
  // Minimum achievable return: min variance portfolio return
  const wMinVar = minimumVariance(covMatrix);
  const minReturn = dotProduct(wMinVar, expectedReturns);
  
  // Maximum achievable return: 100% in highest-return asset
  const maxReturn = Math.max(...expectedReturns);
  
  // Search for optimal return target
  let bestSharpe = -Infinity;
  let bestWeights = wMinVar;
  
  // Grid search over return targets
  const numSteps = 50;
  const returnStep = (maxReturn - minReturn) / numSteps;
  
  for (let i = 0; i <= numSteps; i++) {
    const targetReturn = minReturn + i * returnStep;
    
    // Solve QP with return constraint
    const w = solveQPWithReturnConstraint(covMatrix, expectedReturns, targetReturn, lb, ub);
    
    if (w) {
      const portReturn = dotProduct(w, expectedReturns);
      const portVol = Math.sqrt(portfolioVariance(w, covMatrix));
      
      if (portVol > TOLERANCE) {
        const sharpe = (portReturn - rf_monthly) / portVol;
        
        if (sharpe > bestSharpe) {
          bestSharpe = sharpe;
          bestWeights = w;
        }
      }
    }
  }
  
  // Refine with local search around best
  const bestReturn = dotProduct(bestWeights, expectedReturns);
  const refinedStep = returnStep / 10;
  
  for (let i = -5; i <= 5; i++) {
    const targetReturn = bestReturn + i * refinedStep;
    if (targetReturn < minReturn || targetReturn > maxReturn) continue;
    
    const w = solveQPWithReturnConstraint(covMatrix, expectedReturns, targetReturn, lb, ub);
    
    if (w) {
      const portReturn = dotProduct(w, expectedReturns);
      const portVol = Math.sqrt(portfolioVariance(w, covMatrix));
      
      if (portVol > TOLERANCE) {
        const sharpe = (portReturn - rf_monthly) / portVol;
        
        if (sharpe > bestSharpe) {
          bestSharpe = sharpe;
          bestWeights = w;
        }
      }
    }
  }
  
  return bestWeights;
}


/**
 * ============================================================================
 * RISK PARITY PORTFOLIO
 * ============================================================================
 * 
 * Reference: OptRP.m
 * 
 * minimize:    Σ (RC_i - σ_p/k)²
 * subject to:  Σw_i = 1
 *              w_i ≥ 0
 * 
 * where:
 *   RC_i = w_i × (Σw)_i / σ_p  (risk contribution of asset i)
 *   σ_p = sqrt(w'Σw)           (portfolio volatility)
 *   k = number of assets
 * 
 * From OptRP.m:
 *   Vp = sqrt(w'*V*w);
 *   wo = sum((V*w/Vp.*w - Vp*Ik).^2);  where Ik = ones(k,1)/k
 * 
 * Expanding the objective:
 *   (V*w/Vp .* w) = MCR .* w where MCR_i = (Σw)_i / σ_p
 *   So (V*w/Vp .* w)_i = w_i * (Σw)_i / σ_p = RC_i
 *   And Vp * Ik = σ_p / k for each element
 *   
 *   objective = Σ (RC_i - σ_p/k)²
 */
export function riskParity(covMatrix) {
  const n = covMatrix.length;
  const targetBudget = 1 / n;  // Equal risk budget (1/k)
  
  // Initialize with inverse volatility weights (common starting point)
  let w = [];
  for (let i = 0; i < n; i++) {
    const vol = Math.sqrt(covMatrix[i][i]);
    w.push(vol > 0 ? 1 / vol : 1);
  }
  const sumW = w.reduce((s, v) => s + v, 0);
  w = w.map(v => v / sumW);
  
  // Optimization using gradient descent on the reference objective
  let learningRate = 0.01;
  let prevObjective = Infinity;
  
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    // Compute portfolio volatility
    const sigmaW = matrixVectorMultiply(covMatrix, w);
    const portVar = dotProduct(w, sigmaW);
    const portVol = Math.sqrt(portVar);
    
    if (portVol < TOLERANCE) break;
    
    // Compute risk contributions: RC_i = w_i * (Σw)_i / σ_p
    const rc = w.map((wi, i) => wi * sigmaW[i] / portVol);
    
    // Reference objective: sum((RC_i - σ_p/k)^2)
    // Target for each asset: σ_p / k
    const targetRC = portVol * targetBudget;  // σ_p / k
    
    // Compute objective
    let objective = 0;
    for (let i = 0; i < n; i++) {
      objective += Math.pow(rc[i] - targetRC, 2);
    }
    
    // Compute gradient numerically (more stable for this nonlinear objective)
    const grad = [];
    const h = 1e-7;
    for (let i = 0; i < n; i++) {
      const wPlus = [...w];
      wPlus[i] += h;
      // Renormalize
      const sumPlus = wPlus.reduce((s, v) => s + v, 0);
      const wPlusNorm = wPlus.map(v => v / sumPlus);
      
      const sigmaWPlus = matrixVectorMultiply(covMatrix, wPlusNorm);
      const portVolPlus = Math.sqrt(dotProduct(wPlusNorm, sigmaWPlus));
      const targetRCPlus = portVolPlus * targetBudget;
      
      let objPlus = 0;
      for (let j = 0; j < n; j++) {
        const rcJ = wPlusNorm[j] * sigmaWPlus[j] / portVolPlus;
        objPlus += Math.pow(rcJ - targetRCPlus, 2);
      }
      
      grad.push((objPlus - objective) / h);
    }
    
    // Project gradient to maintain sum=1 constraint
    const meanGrad = grad.reduce((s, g) => s + g, 0) / n;
    const projGrad = grad.map(g => g - meanGrad);
    
    // Update with line search
    let step = learningRate;
    for (let ls = 0; ls < 10; ls++) {
      const wNew = w.map((wi, i) => Math.max(0, wi - step * projGrad[i]));
      const sumNew = wNew.reduce((s, v) => s + v, 0);
      if (sumNew < TOLERANCE) {
        step *= 0.5;
        continue;
      }
      const wNorm = wNew.map(v => v / sumNew);
      
      // Compute new objective
      const sigmaWNew = matrixVectorMultiply(covMatrix, wNorm);
      const portVolNew = Math.sqrt(dotProduct(wNorm, sigmaWNew));
      const targetRCNew = portVolNew * targetBudget;
      
      let objNew = 0;
      for (let j = 0; j < n; j++) {
        const rcJ = wNorm[j] * sigmaWNew[j] / portVolNew;
        objNew += Math.pow(rcJ - targetRCNew, 2);
      }
      
      if (objNew < objective) {
        w = wNorm;
        break;
      }
      step *= 0.5;
    }
    
    // Check convergence
    if (Math.abs(prevObjective - objective) < TOLERANCE && objective < 1e-8) {
      break;
    }
    prevObjective = objective;
    
    // Adaptive learning rate
    if (iter % 200 === 0 && iter > 0) {
      learningRate *= 0.8;
    }
  }
  
  return w;
}


/**
 * ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================
 */

/**
 * Calculate risk contributions for a portfolio
 * @param {number[]} weights - Portfolio weights
 * @param {number[][]} covMatrix - Covariance matrix
 * @returns {number[]} Risk contribution of each asset (as fraction of total)
 */
export function calculateRiskContributions(weights, covMatrix) {
  const sigmaW = matrixVectorMultiply(covMatrix, weights);
  const portVol = Math.sqrt(dotProduct(weights, sigmaW));
  
  if (portVol < TOLERANCE) {
    return weights.map(() => 1 / weights.length);
  }
  
  // Risk contribution: RC_i = w_i * (Σw)_i / σ_p
  const rc = weights.map((w, i) => w * sigmaW[i] / portVol);
  
  // Normalize to sum to 1 (as fractions)
  const totalRC = rc.reduce((s, r) => s + r, 0);
  return rc.map(r => totalRC > 0 ? r / totalRC : 1 / weights.length);
}

/**
 * Create the 50/50 stock-bond benchmark
 * Assumes SPY and AGG are in the asset universe
 * @param {string[]} assetIds - Asset IDs in the universe
 * @returns {number[]} Benchmark weights
 */
export function createBenchmark(assetIds) {
  const weights = assetIds.map(() => 0);
  
  const spyIdx = assetIds.indexOf('SPY');
  const aggIdx = assetIds.indexOf('AGG');
  
  if (spyIdx >= 0 && aggIdx >= 0) {
    weights[spyIdx] = 0.5;
    weights[aggIdx] = 0.5;
  } else {
    // Fallback to equal weight if SPY/AGG not found
    return assetIds.map(() => 1 / assetIds.length);
  }
  
  return weights;
}

/**
 * Run all optimizations and return results
 * @param {number[][]} covMatrix - Covariance matrix
 * @param {number[]} expectedReturns - Expected returns per asset
 * @param {string[]} assetIds - Asset IDs
 * @returns {Object} Object containing all optimized portfolios
 */
export function runAllOptimizations(covMatrix, expectedReturns, assetIds) {
  return {
    benchmark: createBenchmark(assetIds),
    minVariance: minimumVariance(covMatrix),
    riskParity: riskParity(covMatrix),
    maxSharpe: maximumSharpe(covMatrix, expectedReturns),
  };
}


/**
 * Validate portfolio weights
 * @param {number[]} weights - Portfolio weights to validate
 * @returns {Object} Validation results
 */
export function validateWeights(weights) {
  const sum = weights.reduce((s, w) => s + w, 0);
  const allNonNegative = weights.every(w => w >= -TOLERANCE);
  const allBelowOne = weights.every(w => w <= 1 + TOLERANCE);
  
  return {
    valid: Math.abs(sum - 1) < 0.01 && allNonNegative && allBelowOne,
    sum,
    allNonNegative,
    allBelowOne,
    weights: weights.map(w => Math.max(0, Math.min(1, w))),
  };
}
