import React, { useState } from "react";
import { supabase } from '../../supabaseClient';

// ✅ Définition du type des props attendues
type LoginProps = {
  onLoginSuccess: () => void;
};

// ✅ Déclare le composant avec ces props
const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // 🔑 AUTHENTIFICATION RÉELLE AVEC SUPABASE
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // ✅ Authentification réussie - session créée dans Supabase
      console.log("✅ Connexion réussie, utilisateur:", data.user.email);
      onLoginSuccess(); // Appel de la callback parente
    } catch (err: any) {
      console.error("❌ Erreur Supabase:", err);
      setError(err.message || "Erreur de connexion. Vérifiez vos identifiants.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-primary mb-6 text-center">
          Connexion BCM Gest
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              autoComplete="username"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 dark:bg-red-900/30 p-3 rounded-md">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-primary hover:bg-primary-dark text-white rounded-md transition-colors font-medium disabled:opacity-70"
          >
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>
        <div className="mt-6 text-center">
          <a href="#" className="text-sm text-primary hover:underline">
            Mot de passe oublié ?
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;