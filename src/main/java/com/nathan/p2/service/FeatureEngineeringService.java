package com.nathan.p2.service;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.math3.linear.*;
import org.apache.commons.math3.stat.correlation.Covariance;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class FeatureEngineeringService {

    public StandardizedData standardize(double[][] features) {
        int rows = features.length;
        int cols = features[0].length;
        
        double[] means = new double[cols];
        double[] stds = new double[cols];
        
        // Calculate means
        for (int j = 0; j < cols; j++) {
            double sum = 0;
            for (int i = 0; i < rows; i++) {
                sum += features[i][j];
            }
            means[j] = sum / rows;
        }
        
        // Calculate standard deviations
        for (int j = 0; j < cols; j++) {
            double sumSq = 0;
            for (int i = 0; i < rows; i++) {
                sumSq += Math.pow(features[i][j] - means[j], 2);
            }
            stds[j] = Math.sqrt(sumSq / rows);
        }
        
        // Standardize: (x - mean) / std
        double[][] scaled = new double[rows][cols];
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                scaled[i][j] = stds[j] > 0 ? (features[i][j] - means[j]) / stds[j] : 0;
            }
        }
        
        log.info("Standardized {} features: means={}, stds={}", cols, means, stds);
        return new StandardizedData(scaled, means, stds);
    }

    public PCAResult applyPCA(double[][] scaledFeatures, int nComponents) {
        int rows = scaledFeatures.length;
        int cols = scaledFeatures[0].length;
        
        RealMatrix matrix = MatrixUtils.createRealMatrix(scaledFeatures);
        Covariance covariance = new Covariance(matrix);
        RealMatrix covMatrix = covariance.getCovarianceMatrix();
        
        EigenDecomposition eigen = new EigenDecomposition(covMatrix);
        double[] eigenvalues = eigen.getRealEigenvalues();
        
        // Sort eigenvalues descending
        Integer[] indices = new Integer[eigenvalues.length];
        for (int i = 0; i < indices.length; i++) indices[i] = i;
        java.util.Arrays.sort(indices, (a, b) -> Double.compare(eigenvalues[b], eigenvalues[a]));
        
        // Calculate explained variance
        double totalVariance = 0;
        for (double ev : eigenvalues) totalVariance += ev;
        
        double[] explainedVariance = new double[nComponents];
        for (int i = 0; i < nComponents; i++) {
            explainedVariance[i] = eigenvalues[indices[i]] / totalVariance;
        }
        
        // Extract top n eigenvectors
        double[][] components = new double[nComponents][cols];
        for (int i = 0; i < nComponents; i++) {
            RealVector eigenvector = eigen.getEigenvector(indices[i]);
            for (int j = 0; j < cols; j++) {
                components[i][j] = eigenvector.getEntry(j);
            }
        }
        
        // Transform data
        double[][] transformed = new double[rows][nComponents];
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < nComponents; j++) {
                double sum = 0;
                for (int k = 0; k < cols; k++) {
                    sum += scaledFeatures[i][k] * components[j][k];
                }
                transformed[i][j] = sum;
            }
        }
        
        double totalExplained = 0;
        for (double ev : explainedVariance) totalExplained += ev;
        
        log.info("PCA: {} components explain {:.2f}% variance", nComponents, totalExplained * 100);
        return new PCAResult(transformed, explainedVariance, components);
    }

    @Data
    public static class StandardizedData {
        private final double[][] scaled;
        private final double[] means;
        private final double[] stds;
    }

    @Data
    public static class PCAResult {
        private final double[][] transformed;
        private final double[] explainedVariance;
        private final double[][] components;
    }
}
