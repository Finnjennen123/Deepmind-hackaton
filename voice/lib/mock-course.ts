import { Course } from './course-types';

// ═══════════════════════════════════════════
//   DEMO COURSE DATA
//   Replace with real AI-generated course later
// ═══════════════════════════════════════════

export const MOCK_COURSE: Course = {
  title: 'Machine Learning Fundamentals',
  subject: 'Machine Learning',
  phases: [
    {
      id: 'phase_1',
      title: 'Foundations',
      description: 'Core math and programming concepts you need before diving into ML',
      parts: [
        {
          id: 'part_1_1',
          title: 'Linear Algebra Essentials',
          content: `## Vectors and Matrices

Linear algebra is the backbone of machine learning. Every dataset you'll work with is essentially a matrix — rows of data points, columns of features.

### Vectors
A vector is just an ordered list of numbers. Think of it as a point in space:
\`\`\`
v = [3, 7, 2]
\`\`\`
This vector lives in 3D space. In ML, your vectors often have hundreds or thousands of dimensions — one for each feature in your data.

### Matrices
A matrix is a grid of numbers — or equivalently, a collection of vectors stacked together:
\`\`\`
M = [[1, 2, 3],
     [4, 5, 6],
     [7, 8, 9]]
\`\`\`

### Why This Matters
When you feed data into a neural network, you're literally doing matrix multiplication. The "weights" of the network are matrices. Training = finding better matrices.

**Key operations to know:** dot product, matrix multiplication, transpose, inverse.`,
          mastery_criteria: 'Can explain what vectors and matrices are, why they matter in ML, and describe matrix multiplication conceptually.',
          status: 'mastered',
        },
        {
          id: 'part_1_2',
          title: 'Python for Data Science',
          content: `## Python + NumPy Crash Course

You don't need to be a Python expert, but you need to be comfortable with a few key tools.

### NumPy
NumPy is the foundation. It gives you fast array operations:
\`\`\`python
import numpy as np

# Create arrays
a = np.array([1, 2, 3])
b = np.array([4, 5, 6])

# Element-wise operations
print(a + b)      # [5, 7, 9]
print(a * b)      # [4, 10, 18]
print(np.dot(a, b))  # 32 (dot product)
\`\`\`

### Pandas
For loading and exploring data:
\`\`\`python
import pandas as pd
df = pd.read_csv('data.csv')
df.head()        # first 5 rows
df.describe()    # stats summary
\`\`\`

### Matplotlib
For quick visualizations:
\`\`\`python
import matplotlib.pyplot as plt
plt.scatter(df['feature1'], df['target'])
plt.show()
\`\`\`

**You'll use these three libraries in every single ML project.**`,
          mastery_criteria: 'Can write basic NumPy array operations, load a CSV with Pandas, and create a simple plot.',
          status: 'in_progress',
        },
      ],
    },
    {
      id: 'phase_2',
      title: 'Core ML Concepts',
      description: 'The fundamental algorithms and ideas that power all of machine learning',
      parts: [
        {
          id: 'part_2_1',
          title: 'Supervised Learning',
          content: `## Learning from Labeled Data

Supervised learning is the most common type of ML. The idea is simple: you have data with known answers (labels), and you want the machine to learn the pattern so it can predict answers for new data.

### The Setup
- **Training data**: Input-output pairs. "Here's an email (input) and whether it's spam or not (output)."
- **Model**: A function that maps inputs to outputs.
- **Training**: Adjust the model until its predictions match the known outputs.

### Two Types
1. **Classification** — predict a category (spam/not spam, cat/dog, positive/negative)
2. **Regression** — predict a number (house price, temperature, stock price)

### How It Works (Simplified)
1. Start with a random model
2. Feed it training data
3. Measure how wrong it is (loss function)
4. Adjust to be less wrong (gradient descent)
5. Repeat until good enough

This is the core loop of virtually all ML training.`,
          mastery_criteria: 'Can explain the difference between classification and regression, describe the training loop, and give real-world examples of each.',
          status: 'not_started',
        },
        {
          id: 'part_2_2',
          title: 'Loss Functions & Optimization',
          content: `## How Models Learn

A loss function measures "how wrong" your model is. Optimization is the process of making it less wrong.

### Loss Functions
- **Mean Squared Error (MSE)** — for regression. Average of (prediction - actual)².
- **Cross-Entropy Loss** — for classification. Measures how far your probability predictions are from the true labels.

### Gradient Descent
The key algorithm. Imagine you're blindfolded on a hilly landscape and need to find the lowest valley:
1. Feel which direction goes downhill (compute gradient)
2. Take a step that direction (update weights)
3. Repeat

The "learning rate" controls how big each step is. Too big = overshoot. Too small = takes forever.

### Variants
- **Stochastic Gradient Descent (SGD)** — use one random sample per step
- **Mini-batch GD** — use a small batch (most common in practice)
- **Adam** — adaptive learning rate, the go-to optimizer

This is literally how every neural network trains.`,
          mastery_criteria: 'Can explain what a loss function does, describe gradient descent intuitively, and explain why learning rate matters.',
          status: 'locked',
        },
        {
          id: 'part_2_3',
          title: 'Overfitting & Generalization',
          content: `## The Most Important Concept in ML

A model that memorizes training data but fails on new data is useless. This is overfitting.

### The Problem
- **Underfitting**: Model is too simple, misses the pattern
- **Overfitting**: Model is too complex, memorizes noise
- **Good fit**: Model captures the real pattern, generalizes to new data

### How to Detect It
Split your data into training set and test set. If training accuracy is high but test accuracy is low → overfitting.

### How to Prevent It
- **More data** — the best cure
- **Regularization** — penalize overly complex models (L1, L2)
- **Dropout** — randomly turn off neurons during training
- **Early stopping** — stop training before the model starts memorizing
- **Cross-validation** — test on multiple different splits

This concept will follow you through every ML project. Always ask: "Is my model actually learning, or just memorizing?"`,
          mastery_criteria: 'Can explain overfitting vs underfitting, describe at least 3 prevention techniques, and explain train/test splits.',
          status: 'locked',
        },
      ],
    },
    {
      id: 'phase_3',
      title: 'Neural Networks',
      description: 'Deep learning fundamentals — how neural networks actually work under the hood',
      parts: [
        {
          id: 'part_3_1',
          title: 'Perceptrons & Layers',
          content: `## Building Blocks of Deep Learning

A neural network is just layers of simple units (neurons) connected together.

### The Perceptron
The simplest neural network — a single neuron:
1. Takes inputs (features)
2. Multiplies each by a weight
3. Adds them up
4. Passes through an activation function
5. Outputs a value

\`\`\`
output = activation(w1*x1 + w2*x2 + ... + bias)
\`\`\`

### Layers
Stack perceptrons side by side = a layer. Stack layers = a deep neural network.
- **Input layer**: Your raw features
- **Hidden layers**: Where the magic happens (learned representations)
- **Output layer**: The prediction

### Activation Functions
Without these, your entire network collapses to a single linear function (useless).
- **ReLU**: max(0, x) — the default choice
- **Sigmoid**: squishes to 0-1 — good for probabilities
- **Softmax**: turns a vector into probabilities that sum to 1

The depth (number of layers) is what makes "deep learning" deep.`,
          mastery_criteria: 'Can explain how a single neuron works, what layers are, why activation functions are necessary, and name common ones.',
          status: 'locked',
        },
        {
          id: 'part_3_2',
          title: 'Backpropagation',
          content: `## How Neural Networks Actually Learn

Backpropagation is the algorithm that makes deep learning work. It's how the network figures out which weights to adjust and by how much.

### The Intuition
1. **Forward pass**: Feed input through the network, get a prediction
2. **Compute loss**: How wrong was the prediction?
3. **Backward pass**: Trace the error backwards through each layer, computing how much each weight contributed to the error
4. **Update weights**: Adjust each weight to reduce the error

### The Chain Rule
Backprop is just the chain rule from calculus applied repeatedly. Each layer passes its error gradient to the layer before it.

### In Practice
You almost never implement backprop yourself. PyTorch and TensorFlow do it automatically:
\`\`\`python
loss = criterion(prediction, target)
loss.backward()      # computes all gradients
optimizer.step()     # updates all weights
\`\`\`

But understanding what's happening under the hood helps you debug and design better networks.`,
          mastery_criteria: 'Can explain the forward and backward pass, the role of the chain rule, and how weights get updated during training.',
          status: 'locked',
        },
      ],
    },
    {
      id: 'phase_4',
      title: 'Practical ML',
      description: 'Putting it all together — building and deploying real models',
      parts: [
        {
          id: 'part_4_1',
          title: 'Building Your First Model',
          content: `## From Zero to Trained Model

Let's put everything together and build a real classifier using PyTorch.

### The Workflow
1. **Load data** — Use a standard dataset (MNIST, CIFAR-10)
2. **Define model** — Stack layers
3. **Set loss function + optimizer**
4. **Training loop** — Forward, loss, backward, update
5. **Evaluate** — Test on held-out data

### Example: Digit Classifier
\`\`\`python
import torch
import torch.nn as nn

model = nn.Sequential(
    nn.Linear(784, 128),
    nn.ReLU(),
    nn.Linear(128, 64),
    nn.ReLU(),
    nn.Linear(64, 10)
)

criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

for epoch in range(10):
    for images, labels in train_loader:
        outputs = model(images.view(-1, 784))
        loss = criterion(outputs, labels)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
\`\`\`

That's it. This simple network can achieve ~97% accuracy on handwritten digits.`,
          mastery_criteria: 'Can describe the end-to-end ML workflow and explain each step of a basic PyTorch training loop.',
          status: 'locked',
        },
        {
          id: 'part_4_2',
          title: 'Model Evaluation & Iteration',
          content: `## Is Your Model Actually Good?

Accuracy alone doesn't tell the full story. You need the right metrics and a systematic approach to improvement.

### Key Metrics
- **Accuracy** — % correct (can be misleading with imbalanced data)
- **Precision** — of all positive predictions, how many were correct?
- **Recall** — of all actual positives, how many did you catch?
- **F1 Score** — harmonic mean of precision and recall
- **Confusion Matrix** — full breakdown of predictions vs reality

### Systematic Improvement
1. **Baseline** — Start simple (even a random guess)
2. **Error analysis** — Look at what the model gets wrong. Are there patterns?
3. **Feature engineering** — Can you give the model better inputs?
4. **Architecture search** — Try different model structures
5. **Hyperparameter tuning** — Learning rate, batch size, layers, etc.

### The ML Mindset
ML is iterative. You rarely get it right on the first try. The skill is in knowing what to try next based on what you're seeing.`,
          mastery_criteria: 'Can explain precision, recall, and F1 score. Can describe a systematic approach to improving a model.',
          status: 'locked',
        },
      ],
    },
  ],
};
