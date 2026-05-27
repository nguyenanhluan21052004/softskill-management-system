import React from 'react';

const colorThemes = {
  admin: {
    sidebar: 'from-slate-950 via-blue-950 to-slate-900',
    active: 'bg-blue-600 text-white shadow-lg shadow-blue-900/30',
    badge: 'bg-blue-100 text-blue-700',
    accent: 'bg-blue-600',
    soft: 'bg-blue-50 text-blue-700',
  },
  student: {
    sidebar: 'from-violet-950 via-violet-900 to-fuchsia-900',
    active: 'bg-violet-500 text-white shadow-lg shadow-violet-900/30',
    badge: 'bg-violet-100 text-violet-700',
    accent: 'bg-violet-500',
    soft: 'bg-violet-50 text-violet-700',
  },
  teacher: {
    sidebar: 'from-emerald-950 via-emerald-900 to-teal-900',
    active: 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/30',
    badge: 'bg-emerald-100 text-emerald-700',
    accent: 'bg-emerald-500',
    soft: 'bg-emerald-50 text-emerald-700',
  },
};

const DashboardFrame = ({
  role = 'admin',
  title,
  subtitle,
  user,
  onLogout,
  menuItems = [],
  headerControls,
  rightNotes = [],
  children,
}) => {
  const theme = colorThemes[role] || colorThemes.admin;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.15),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(167,139,250,0.10),_transparent_25%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-row">
        <aside className={`w-[280px] shrink-0 bg-gradient-to-b ${theme.sidebar} px-4 py-6 text-white`}>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">System</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight">SOFT SKILLS</h1>
            <p className="text-sm text-white/75">Evaluation System</p>
          </div>

          <nav className="mt-6 grid gap-2">
            {menuItems.map((item, index) => (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  item.active ? theme.active : 'bg-white/5 text-white/80 hover:bg-white/10'
                } ${item.onClick ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs">
                  {index + 1}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                {String(user?.name || 'U')
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.name || title}</p>
                <p className="text-xs text-white/70">{subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="mt-4 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-100"
            >
              Dang xuat
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 px-4 py-4 sm:px-6 xl:px-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <header className="rounded-[28px] border border-slate-200/70 bg-white/90 px-5 py-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] ${theme.soft}`}>
                      Dashboard
                    </p>
                    <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{title}</h2>
                    <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {headerControls}
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className={`h-10 w-10 rounded-full ${theme.accent}`} />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{user?.name || 'Nguoi dung'}</p>
                        <p className="text-xs text-slate-500">Online</p>
                      </div>
                    </div>
                  </div>
                </div>
              </header>

              <div className="mt-6">{children}</div>
            </div>

            {rightNotes.length > 0 ? (
              <aside className="grid content-start gap-5">
                {rightNotes.map((section) => (
                  <section
                    key={section.title}
                    className="rounded-[28px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.4)]"
                  >
                    <h3 className="text-base font-extrabold uppercase tracking-wide text-slate-800">{section.title}</h3>
                    <div className="mt-4 grid gap-3">
                      {section.items.map((item, index) => (
                        <div key={`${section.title}-${item}`} className="flex gap-3">
                          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${theme.soft}`}>
                            {index + 1}
                          </span>
                          <p className="text-sm leading-6 text-slate-600">{item}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardFrame;
