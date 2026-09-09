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

# ── โหลด CSV ──────────────────────────────────────────────────────────────────
# เปลี่ยนชื่อไฟล์ให้ตรงกับที่มี และเพิ่ม bad_foot
df_good = pd.read_csv("squat_data_good_cleaned.csv")
df_heel = pd.read_csv("squat_data_bad_heel_cleaned.csv")
df_back = pd.read_csv("squat_data_bad_back_cleaned.csv")
df_foot = pd.read_csv("squat_data_bad_foot_cleaned.csv")  # เพิ่ม

df_good["label"] = "squat_good"
df_heel["label"] = "squat_bad_heel"
df_back["label"] = "squat_bad_back"
df_foot["label"] = "squat_bad_foot"  # เพิ่ม

df = pd.concat([df_good, df_heel, df_back, df_foot], ignore_index=True)
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

print(f"✓ โหลดข้อมูลสำเร็จ: {df.shape}")
print(df["label"].value_counts())

# ── Prepare ───────────────────────────────────────────────────────────────────
X     = df.drop(columns=["label"]).values
y     = df["label"].values
le    = LabelEncoder()
y_enc = le.fit_transform(y)

X_train, X_test, y_train, y_test = train_test_split(
    X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
)
print(f"Train: {X_train.shape[0]} | Test: {X_test.shape[0]}")

# ── Train ─────────────────────────────────────────────────────────────────────
models = {
    "Random Forest": Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(
            n_estimators=300, min_samples_leaf=2,
            random_state=42, n_jobs=-1,
        )),
    ]),
    "Gradient Boosting": Pipeline([
        ("scaler", StandardScaler()),
        ("clf", GradientBoostingClassifier(
            n_estimators=300, learning_rate=0.1,
            max_depth=4, random_state=42,
        )),
    ]),
    "MLP Neural Network": Pipeline([
        ("scaler", StandardScaler()),
        ("clf", MLPClassifier(
            hidden_layer_sizes=(256, 128, 64),
            activation="relu", max_iter=500,
            random_state=42, early_stopping=True,
        )),
    ]),
}

cv      = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
results = {}

for name, model in models.items():
    print(f"\nTraining: {name} ...")
    model.fit(X_train, y_train)
    y_pred    = model.predict(X_test)
    test_acc  = accuracy_score(y_test, y_pred)
    cv_scores = cross_val_score(model, X, y_enc, cv=cv, scoring="accuracy", n_jobs=-1)
    results[name] = {
        "model": model, "test_acc": test_acc,
        "cv_mean": cv_scores.mean(), "cv_std": cv_scores.std(),
        "y_pred": y_pred,
    }
    print(f"  Test Acc: {test_acc:.4f} | CV: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

# ── Best model ────────────────────────────────────────────────────────────────
best_name = max(results, key=lambda k: results[k]["cv_mean"])
best      = results[best_name]

print(f"\n★ Best: {best_name} | CV: {best['cv_mean']:.4f}")
print(classification_report(y_test, best["y_pred"], target_names=le.classes_))

# ── Save ──────────────────────────────────────────────────────────────────────
joblib.dump(best["model"], "squat_model.pkl")
joblib.dump(le,            "label_encoder.pkl")
print("✓ บันทึก squat_model.pkl และ label_encoder.pkl สำเร็จ")