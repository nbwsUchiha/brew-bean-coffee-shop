import { FormEvent, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { userEmail, signIn, signUp, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (mode === "signin") await signIn(email, password);
      else await signUp(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    }
  };

  if (userEmail) {
    return (
      <section>
        <h1>Account</h1>
        <p>Signed in as {userEmail}</p>
        <button className="btn ghost" onClick={() => signOut()}>Sign out</button>
      </section>
    );
  }

  return (
    <section>
      <h1>{mode === "signin" ? "Sign in" : "Create account"}</h1>
      <form onSubmit={onSubmit} className="card" style={{ maxWidth: 420 }}>
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ display: "block", width: "100%", marginBottom: 8, padding: 8 }} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ display: "block", width: "100%", marginBottom: 8, padding: 8 }} />
        {error && <p className="error">{error}</p>}
        <button className="btn primary" type="submit" style={{ border: 0, cursor: "pointer" }}>{mode === "signin" ? "Sign in" : "Sign up"}</button>
      </form>
      <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
        {mode === "signin" ? "Need an account?" : "Already have an account?"}
      </button>
    </section>
  );
}
