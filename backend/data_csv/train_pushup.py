import pandas as pd
import numpy as np
import joblib
import warnings
warnings.filterwarnings("ignore")

from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.pipeline import Pipeline

# ── เปลี่ยนชื่อไฟล์ให้ตรงกับที่มี ──────────────────────────────────────────
df_good = pd.read_csv("pushup_data_good.csv")
df_neck = pd.read_csv("pushup_data_bad_neck.csv")
df_back = pd.read_csv("pushup_data_bad_back.csv")

df_good["label"] = "pushup_good"
df_neck["label"] = "pushup_bad_neck"
df_back["label"] = "pushup_bad_back"

df = pd.concat([df_good, df_neck, df_back], ignore_index=True)
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

print(f"✓ โหลดข้อมูลสำเร็จ: {df.shape}")
print(df["label"].value_counts())

X     = df.drop(columns=["label"]).values
y     = df["label"].values
le    = LabelEncoder()
y_enc = le.fit_transform(y)

X_train, X_test, y_train, y_test = train_test_split(
    X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
)

models = {
    "Random Forest": Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(n_estimators=300, min_samples_leaf=2, random_state=42, n_jobs=-1)),
    ]),
    "Gradient Boosting": Pipeline([
        ("scaler", StandardScaler()),
        ("clf", GradientBoostingClassifier(n_estimators=300, learning_rate=0.1, max_depth=4, random_state=42)),
    ]),
    "MLP Neural Network": Pipeline([
        ("scaler", StandardScaler()),
        ("clf", MLPClassifier(hidden_layer_sizes=(256, 128, 64), activation="relu", max_iter=500, random_state=42, early_stopping=True)),
    ]),
}

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
results = {}

for name, model in models.items():
    print(f"\nTraining: {name} ...")
    model.fit(X_train, y_train)
    y_pred    = model.predict(X_test)
    test_acc  = accuracy_score(y_test, y_pred)
    cv_scores = cross_val_score(model, X, y_enc, cv=cv, scoring="accuracy", n_jobs=-1)
    results[name] = {"model": model, "test_acc": test_acc, "cv_mean": cv_scores.mean(), "y_pred": y_pred}
    print(f"  Test Acc: {test_acc:.4f} | CV: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

best_name = max(results, key=lambda k: results[k]["cv_mean"])
best      = results[best_name]
print(f"\n★ Best: {best_name} | CV: {best['cv_mean']:.4f}")
print(classification_report(y_test, best["y_pred"], target_names=le.classes_))

joblib.dump(best["model"], "pushup_model.pkl")
joblib.dump(le,            "pushup_label_encoder.pkl")
print("✓ บันทึก pushup_model.pkl และ pushup_label_encoder.pkl สำเร็จ")