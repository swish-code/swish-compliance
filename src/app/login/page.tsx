import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f7f4] px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
            <span className="font-black text-brand-700 text-lg">S</span>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-gray-500">Swish</div>
            <div className="font-bold text-lg leading-tight">Compliance App</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h1 className="text-xl font-semibold mb-1">Sign in</h1>
          <p className="text-sm text-gray-500 mb-6">
            Use your account email and password.
          </p>
          <LoginForm />
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">
          Swish Compliance ECS · Internal use only
        </p>
      </div>
    </div>
  );
}
