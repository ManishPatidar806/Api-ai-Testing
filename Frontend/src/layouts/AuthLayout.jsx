import { Link, Outlet } from 'react-router-dom';

function AuthLayout() {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-100 lg:grid-cols-2">
      <section className="hidden border-r border-slate-200 bg-slate-900 p-12 text-slate-100 lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-300">AI Platform</p>
          <h1 className="mt-3 max-w-sm text-3xl font-semibold leading-tight">
            Test, diagnose, and optimize APIs with confidence.
          </h1>
        </div>
        <p className="max-w-md text-sm text-slate-300">
          A practical developer-focused workspace to send requests, run tests, and get AI-powered root-cause analysis in seconds.
        </p>
      </section>

      <section className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center lg:hidden">
            <h1 className="text-2xl font-semibold text-slate-900">AI API Testing Platform</h1>
          </div>
          <Outlet />
          <p className="mt-6 text-center text-xs text-slate-500">
            Need help? <Link to="/ai-chat" className="font-medium text-slate-700">Ask AI Assistant</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default AuthLayout;
