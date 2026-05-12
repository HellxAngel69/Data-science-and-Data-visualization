import pandas as pd
import numpy as np

df = pd.read_csv("/content/pollution_2000_2021.csv")

print("Raw Data Overview")
print("Initial Shape:", df.shape)

missing_before = df.isnull().sum()
print("\nMissing Values (Before Cleaning):")
print(missing_before)
print("Total Missing (Before):", missing_before.sum())

print("\nHandling Missing Value")

numeric_cols = df.select_dtypes(include=[np.number]).columns
categorical_cols = df.select_dtypes(include=["object"]).columns

for col in numeric_cols:
    df[col] = df[col].fillna(df[col].mean())

for col in categorical_cols:
    df[col] = df[col].fillna(df[col].mode()[0])

df = df.drop_duplicates()

print("\nOutlier Removal (IQR Method)")
before_outlier = df.shape[0]

def remove_outliers_iqr(data, columns):
    for col in columns:
        Q1 = data[col].quantile(0.25)
        Q3 = data[col].quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR
        data = data[(data[col] >= lower_bound) & (data[col] <= upper_bound)]
    return data

print("\nOutlier Detection (IQR Method - Detection Only)")

numeric_cols = df.select_dtypes(include=[np.number]).columns

outlier_summary = {}

for col in numeric_cols:

    Q1 = df[col].quantile(0.25)
    Q3 = df[col].quantile(0.75)
    IQR = Q3 - Q1

    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR

    outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)]

    outlier_summary[col] = len(outliers)

print("\nOutlier Summary (Detected but Retained):")

for col, count in outlier_summary.items():
    print(f"{col}: {count} potential outliers")

print("\nData Transformation")

df['Date'] = pd.to_datetime(df['Date'])
df['Year'] = df['Date'].dt.year
df['Month'] = df['Date'].dt.month

aqi_cols = ['O3 AQI', 'CO AQI', 'SO2 AQI', 'NO2 AQI']
df['Overall_AQI'] = df[aqi_cols].max(axis=1)

cols_to_save = [
    "CO Mean", "NO2 Mean", "SO2 Mean", "O3 Mean", 
    "CO AQI", "NO2 AQI", "SO2 AQI", "O3 AQI", "Overall_AQI"
]

print("\nAggregating Data by Year and State")
yearly_state_avg = df.groupby(["Year", "State"])[cols_to_save].mean().reset_index()

print("\nYearly and State Aggregated Data (Preview):")
display(yearly_state_avg.head())

yearly_state_avg.to_json("pollution_yearly_avg.json", orient="records")

yearly_state_avg.to_csv("pollution_yearly_avg.csv", index=False)

print("\nProcess Completed")
print(f"Final Data Shape for Visualization: {yearly_state_avg.shape}")
print("Files saved: pollution_yearly_avg.json, pollution_yearly_avg.csv")

print("\nPreview of Processed Data:")
print(yearly_state_avg.head())
