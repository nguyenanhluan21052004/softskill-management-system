import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';

const roleRedirect = {
  admin: '/admin',
  teacher: '/teacher',
  student: '/student',
};

const featureItems = [
  {
    title: 'Danh gia toan dien',
    desc: 'Danh gia 4 ky nang cot loi: Giao tiep, Lam viec nhom, Tu duy phan bien, Quan ly thoi gian.',
    tone: 'from-blue-100 to-blue-200',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-blue-700" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 7a3 3 0 1 0 0 6" />
        <path d="M17 7a3 3 0 1 1 0 6" />
        <path d="M4 19c0-2.5 3.5-4 8-4s8 1.5 8 4" />
      </svg>
    ),
  },
  {
    title: 'Theo doi tien bo',
    desc: 'Theo doi su phat trien ky nang theo tung tuan, tung hoc ky mot cach truc quan.',
    tone: 'from-emerald-100 to-emerald-200',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 19h16" />
        <path d="M6 16l4-4 4 3 4-6" />
        <path d="M18 9V5h-4" />
      </svg>
    ),
  },
  {
    title: 'Bao cao thong minh',
    desc: 'He thong bao cao va phan tich giup dua ra nhan xet va khuyen nghi phu hop.',
    tone: 'from-violet-100 to-indigo-200',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-violet-700" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3v4" />
        <path d="M8 7h8" />
        <path d="M5 21h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </svg>
    ),
  },
  {
    title: 'Bao mat va tin cay',
    desc: 'Du lieu duoc bao mat tuyet doi, dam bao tinh rieng tu va an toan cho he thong.',
    tone: 'from-amber-100 to-orange-200',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 text-amber-700" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
];

const LoginPage = ({ onLogin }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await login({ username, password });
      const data = response.data || {};
      const user = {
        id: data.id || data.userId || data.teacherId || data.studentId || 0,
        name: data.name || data.fullName || username,
        role: String(data.role || '').toLowerCase(),
        token: data.token || '',
      };

      if (!roleRedirect[user.role]) {
        throw new Error('Vai tro tra ve tu may chu khong hop le.');
      }

      onLogin(user);
      navigate(roleRedirect[user.role]);
    } catch (requestError) {
      const apiMessage = requestError?.response?.data?.message || requestError?.response?.data;
      setError(apiMessage || requestError.message || 'Dang nhap that bai. Vui long thu lai.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-100">
      <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-blue-200/60 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-sky-200/50 blur-3xl" />

      <div className="mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_440px] lg:gap-16 lg:px-10 lg:py-12">
        <div className="max-w-2xl lg:py-4">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 10l8-6 8 6" />
                <path d="M6 10v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8" />
                <path d="M10 14h4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-700">Soft Skills</p>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Evaluation System</h2>
            </div>
          </div>

          <div className="mt-10 max-w-xl">
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl xl:text-[4.2rem]">
              Danh gia ky nang mem
              <span className="mt-2 block text-blue-700">Kien tao tuong lai</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600 sm:text-xl">
              He thong phan tich va danh gia ky nang mem cua sinh vien dua tren du lieu hoc tap va hoat dong nhom.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {featureItems.map((item) => (
              <article
                key={item.title}
                className="rounded-[26px] border border-white/70 bg-white/75 p-5 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.2)] backdrop-blur"
              >
                <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${item.tone}`}>
                  {item.icon}
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.desc}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="w-full lg:justify-self-end">
          <div className="rounded-[32px] border border-white/80 bg-white/90 p-7 shadow-[0_25px_70px_-32px_rgba(15,23,42,0.35)] backdrop-blur sm:p-9">
            <div className="text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Dang nhap</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
                Vui long dang nhap de tiep tuc su dung he thong.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block text-sm font-semibold text-slate-700">
                <span className="mb-2 block">Email hoac ten dang nhap</span>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 7h16" />
                      <path d="M6 7v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
                      <path d="M9 11h6" />
                    </svg>
                  </span>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Nhap email hoac ten dang nhap"
                    autoComplete="username"
                    required
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                <span className="mb-2 block">Mat khau</span>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M7 11V8a5 5 0 0 1 10 0v3" />
                      <rect x="5" y="11" width="14" height="9" rx="2" />
                      <path d="M12 15v2" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Nhap mat khau"
                    autoComplete="current-password"
                    required
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-12 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </span>
                </div>
              </label>

              <div className="flex items-center justify-between gap-4 text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                  Ghi nho dang nhap
                </label>
                <button type="button" className="font-semibold text-blue-600 transition hover:text-blue-700">
                  Quen mat khau?
                </button>
              </div>

              {error ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Dang dang nhap...' : 'Dang nhap'}
              </button>
            </form>

            <p className="mt-7 text-center text-xs text-slate-400">
              © 2025 Soft Skills Evaluation System. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoginPage;
