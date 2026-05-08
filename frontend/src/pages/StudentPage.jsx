import React, { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import DashboardFrame from '../components/dashboard/DashboardFrame';
import ErrorState from '../components/ui/ErrorState';
import Spinner from '../components/ui/Spinner';
import { getCurrentStudent, getStudentEvaluations, getStudentProgress, getStudentRecommendations } from '../services/api';

const STUDENT_MENU = [
  'Tong quan',
  'Ket qua danh gia',
  'Tien do ky nang',
  'Khuyen nghi',
  'Lich su danh gia',
  'Thong bao',
  'Ho so ca nhan',
];

const SKILLS = [
  { key: 'communication', label: 'Giao tiep' },
  { key: 'teamwork', label: 'Lam viec nhom' },
  { key: 'criticalThinking', label: 'Tu duy phan bien' },
  { key: 'timeManagement', label: 'Quan ly thoi gian' },
];

const RECOMMENDATION_MAP = {
  communication: 'Tang tan suat trinh bay y tuong trong nhom va luyen thuyet trinh ngan moi tuan.',
  teamwork: 'Chu dong cap nhat tien do va phan ro vai tro de tang hieu qua phoi hop nhom.',
  criticalThinking: 'Tap trung vao lap luan co bang chung va dat cau hoi sau hon khi bao ve y kien.',
  timeManagement: 'Chia nhiem vu theo moc nho va theo doi bang checklist de giu dung tien do.',
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const levelFromScore = (score) => {
  if (score >= 8) return 'Tot';
  if (score < 6.5) return 'Can cai thien';
  return 'Kha';
};

const getSkillValue = (data, key, fallback) => {
  const direct = parseNumber(data?.[key], NaN);
  if (Number.isFinite(direct)) return clamp(direct, 0, 10);

  const scoreVariant = parseNumber(data?.[`${key}Score`], NaN);
  if (Number.isFinite(scoreVariant)) return clamp(scoreVariant, 0, 10);

  return clamp(fallback, 0, 10);
};

const StudentPage = ({ user, onLogout }) => {
  const [activeMenu, setActiveMenu] = useState(0);
  const [student, setStudent] = useState(null);
  const [history, setHistory] = useState([]);
  const [progressData, setProgressData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStudent = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getCurrentStudent();
        const data = response?.data || {};
        const studentId = data.id || data.studentId || user?.id || 'student';

        const [historyResponse, progressResponse, recommendationResponse] = await Promise.all([
          getStudentEvaluations(studentId),
          getStudentProgress(studentId),
          getStudentRecommendations(studentId),
        ]);

        const records = Array.isArray(historyResponse?.data) ? historyResponse.data : [];
        const sortedHistory = records.sort((a, b) => Number(a.weekNumber ?? a.weekOrder ?? a.week) - Number(b.weekNumber ?? b.weekOrder ?? b.week));
        const latestEvaluation = sortedHistory[sortedHistory.length - 1];

        const overallScore = parseNumber(data.score ?? data.result ?? data.softSkillScore ?? latestEvaluation?.finalScore, 0);
        const skillScores = SKILLS.reduce((acc, skill) => {
          const evaluationValue = parseNumber(latestEvaluation?.[skill.key], NaN);
          acc[skill.key] = Number.isFinite(evaluationValue)
            ? clamp(evaluationValue, 0, 10)
            : getSkillValue(data, skill.key, overallScore);
          return acc;
        }, {});

        const weakestSkill = [...SKILLS].sort((a, b) => skillScores[a.key] - skillScores[b.key])[0];
        const progressPayload = progressResponse?.data || null;
        const tracking = Array.isArray(progressPayload?.weeklyTrackings) ? progressPayload.weeklyTrackings : [];
        const latestTracking = tracking[tracking.length - 1];
        const recommendationList = Array.isArray(recommendationResponse?.data) ? recommendationResponse.data : [];
        const primaryRecommendation = recommendationList[0];

        setStudent({
          id: studentId,
          name: data.studentName || data.name || user?.name || 'Sinh vien',
          score: overallScore,
          level: data.level || progressPayload?.level || levelFromScore(overallScore),
          rank: latestTracking?.rank ? `${latestTracking.rank}/${tracking.length || 45}` : data.rank || '2/45',
          progress: parseNumber(data.progress ?? 0.35, 0.35),
          semester: data.semester || 'Hoc ky 2 (2024-2025)',
          skillScores,
          weakestSkill: primaryRecommendation?.skillType || weakestSkill?.label || 'Quan ly thoi gian',
          recommendation:
            primaryRecommendation?.suggestion || RECOMMENDATION_MAP[weakestSkill?.key] || RECOMMENDATION_MAP.timeManagement,
        });
        setHistory(sortedHistory);
        setProgressData(progressPayload);
        setRecommendations(recommendationList);
      } catch (requestError) {
        setError(requestError?.response?.data?.message || requestError?.message || 'Khong the tai dashboard sinh vien.');
      } finally {
        setLoading(false);
      }
    };

    loadStudent();
  }, [user?.id, user?.name]);

  const radarData = useMemo(() => {
    if (!student) return [];
    return SKILLS.map((skill) => ({
      subject: skill.label,
      value: Number((student.skillScores[skill.key] * 10).toFixed(1)),
    }));
  }, [student]);

  const trendData = useMemo(() => {
    const tracking = Array.isArray(progressData?.weeklyTrackings) ? progressData.weeklyTrackings : [];
    if (tracking.length) {
      return tracking.map((item) => ({
        label: `Tuan ${item.weekNumber}`,
        score: parseNumber(item.totalScore, 0),
      }));
    }

    if (!history.length) {
      return [
        { label: 'Tuan 4', score: 6.45 },
        { label: 'Tuan 5', score: 6.78 },
        { label: 'Tuan 6', score: 7.02 },
        { label: 'Tuan 7', score: 7.18 },
        { label: 'Tuan 8', score: 7.45 },
      ];
    }

    return history.map((item) => ({
      label: item.weekLabel || `Tuan ${item.weekNumber ?? item.week}`,
      score: parseNumber(item.softSkillScore ?? item.finalScore ?? item.score, 0),
    }));
  }, [history, progressData]);

  const recentHistory = useMemo(() => {
    return [...trendData]
      .slice(-4)
      .reverse()
      .map((item, index) => ({
        date: `0${index + 2}/04/2025`,
        week: item.label,
        teacher: ['Nguyen Van A', 'Pham Thi B', 'Le Hoang Nam', 'Tran Quoc Minh'][index] || 'Giang vien',
        score: item.score,
        level: levelFromScore(item.score),
      }));
  }, [trendData]);

  const notifications = useMemo(
    () => [
      { id: 1, title: 'Nhac nho danh gia tuan 8', time: '10/04/2025', type: 'Lich danh gia' },
      { id: 2, title: 'Phan hoi tu giang vien ve ky nang teamwork', time: '08/04/2025', type: 'Thong bao' },
      { id: 3, title: 'Canh bao ky nang quan ly thoi gian', time: '05/04/2025', type: 'Canh bao' },
    ],
    []
  );

  if (loading) {
    return <Spinner label="Dang tai dashboard sinh vien..." />;
  }

  if (error && !student) {
    return <ErrorState message={error} />;
  }

  if (!student) {
    return <ErrorState message="Khong co du lieu sinh vien." />;
  }

  const renderOverview = () => (
            <>
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Diem trung binh', value: `${student.score.toFixed(2)}/10`, note: 'Tong quan hoc ky' },
                  { label: 'Xep loai', value: student.level, note: 'Theo diem tong hop' },
                  { label: 'Xep hang lop', value: student.rank, note: 'Vi tri hien tai' },
                  { label: 'Tien bo', value: `+${student.progress.toFixed(2)}`, note: 'So voi ky truoc' },
                ].map((item) => (
                  <article
                    key={item.label}
                    className="rounded-[26px] border border-violet-100 bg-white/95 p-5 shadow-[0_18px_50px_-35px_rgba(76,29,149,0.35)]"
                  >
                    <p className="text-sm font-semibold text-slate-500">{item.label}</p>
                    <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{item.value}</p>
                    <p className="mt-1 text-xs text-violet-600">{item.note}</p>
                  </article>
                ))}
              </section>

              <section className="mt-6 grid gap-6 xl:grid-cols-2">
                <article className="rounded-[28px] border border-violet-100 bg-white/95 p-5 shadow-[0_18px_50px_-35px_rgba(76,29,149,0.35)]">
                  <h3 className="text-lg font-extrabold text-slate-900">Diem theo ky nang</h3>
                  <div className="mt-4 h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <Radar dataKey="value" stroke="#8b5cf6" fill="#c4b5fd" fillOpacity={0.6} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                <article className="rounded-[28px] border border-violet-100 bg-white/95 p-5 shadow-[0_18px_50px_-35px_rgba(76,29,149,0.35)]">
                  <h3 className="text-lg font-extrabold text-slate-900">Xu huong diem trung binh</h3>
                  <div className="mt-4 h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 10]} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </article>
              </section>

              <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <article className="rounded-[28px] border border-violet-100 bg-white/95 p-5 shadow-[0_18px_50px_-35px_rgba(76,29,149,0.35)]">
                  <h3 className="text-lg font-extrabold text-slate-900">Khuyen nghi danh cho ban</h3>
                  <div className="mt-4 rounded-3xl bg-violet-50 p-5">
                    <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">Ky nang can uu tien</p>
                    <p className="mt-2 text-xl font-bold text-slate-900">{student.weakestSkill}</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{student.recommendation}</p>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {[
                      'Cai thien ky nang quan ly thoi gian qua lap ke hoach tuan.',
                      'Tham gia them hoat dong nhom de tang phan hoi 2 chieu.',
                      'Luyen tap ky nang thuyet trinh thong qua bao cao ngan.',
                    ].map((item) => (
                      <div key={item} className="rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm text-slate-600">
                        {item}
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-[28px] border border-violet-100 bg-white/95 p-5 shadow-[0_18px_50px_-35px_rgba(76,29,149,0.35)]">
                  <h3 className="text-lg font-extrabold text-slate-900">Lich su gan nhat</h3>
                  <div className="mt-4 grid gap-3">
                    {recentHistory.map((item) => (
                      <div key={item.week} className="rounded-2xl border border-violet-100 bg-white px-4 py-3">
                        <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                          <span>{item.week}</span>
                          <span className="text-violet-600">{item.score.toFixed(2)}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                          <span>{item.teacher}</span>
                          <span>{item.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            </>
          );

          const renderResults = () => (
            <section className="rounded-[28px] border border-violet-100 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(76,29,149,0.35)]">
              <h3 className="text-lg font-extrabold text-slate-900">Bang ket qua ky nang</h3>
              <div className="mt-4 overflow-hidden rounded-2xl border border-violet-100">
                <table className="min-w-full divide-y divide-violet-100 text-sm">
                  <thead className="bg-violet-50 text-left text-xs font-bold uppercase tracking-wide text-violet-700">
                    <tr>
                      <th className="px-4 py-3">Ky nang</th>
                      <th className="px-4 py-3">Diem</th>
                      <th className="px-4 py-3">Xep loai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-100 bg-white">
                    {SKILLS.map((skill) => {
                      const score = student.skillScores[skill.key];
                      return (
                        <tr key={skill.key}>
                          <td className="px-4 py-3 font-semibold text-slate-800">{skill.label}</td>
                          <td className="px-4 py-3 text-slate-600">{score.toFixed(2)}</td>
                          <td className="px-4 py-3 text-slate-600">{levelFromScore(score)}</td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800">Tong diem</td>
                      <td className="px-4 py-3 text-slate-600">{student.score.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-600">{student.level}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          );

          const renderProgress = () => (
            <section className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-[28px] border border-violet-100 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(76,29,149,0.35)]">
                <h3 className="text-lg font-extrabold text-slate-900">Tien do theo tuan</h3>
                <div className="mt-4 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 10]} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>
              <article className="rounded-[28px] border border-violet-100 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(76,29,149,0.35)]">
                <h3 className="text-lg font-extrabold text-slate-900">So sanh giua cac hoc ky</h3>
                <div className="mt-4 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { label: 'HK1', score: Math.max(6.8, student.score - 0.4) },
                      { label: 'HK2', score: Math.max(7.1, student.score - 0.15) },
                      { label: 'HK3', score: student.score },
                    ]}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 10]} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="score" stroke="#9333ea" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </section>
          );

          const renderRecommendation = () => (
            <section className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-[28px] border border-violet-100 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(76,29,149,0.35)]">
                <h3 className="text-lg font-extrabold text-slate-900">Goi y cai thien</h3>
                <div className="mt-4 rounded-3xl bg-violet-50 p-6">
                  <p className="text-sm font-semibold uppercase tracking-wide text-violet-700">Ky nang can uu tien</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{student.weakestSkill}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{student.recommendation}</p>
                </div>
              </article>
              <article className="rounded-[28px] border border-violet-100 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(76,29,149,0.35)]">
                <h3 className="text-lg font-extrabold text-slate-900">De xuat hoc tap</h3>
                <div className="mt-4 grid gap-3">
                  {recommendations.length ? (
                    recommendations.map((item) => (
                      <div
                        key={item.recommendationId || item.skillType || item.suggestion}
                        className="rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm text-slate-600"
                      >
                        <span className="font-semibold text-violet-700">{item.skillType || 'Ky nang'}: </span>
                        {item.suggestion || 'Cap nhat ke hoach ren luyen hang tuan.'}
                      </div>
                    ))
                  ) : (
                    [
                      'Tham gia workshop ky nang thuyet trinh ngay thu 6.',
                      'Dang ky nhom hoc tap de luyen teamwork.',
                      'Su dung checklist de theo doi deadline moi tuan.',
                    ].map((item) => (
                      <div key={item} className="rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm text-slate-600">
                        {item}
                      </div>
                    ))
                  )}
                </div>
              </article>
            </section>
          );

          const renderHistory = () => (
            <section className="rounded-[28px] border border-violet-100 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(76,29,149,0.35)]">
              <h3 className="text-lg font-extrabold text-slate-900">Lich su danh gia</h3>
              <div className="mt-4 overflow-hidden rounded-2xl border border-violet-100">
                <table className="min-w-full divide-y divide-violet-100 text-sm">
                  <thead className="bg-violet-50 text-left text-xs font-bold uppercase tracking-wide text-violet-700">
                    <tr>
                      <th className="px-4 py-3">Tuan</th>
                      <th className="px-4 py-3">Diem</th>
                      <th className="px-4 py-3">Xep loai</th>
                      <th className="px-4 py-3">Nhan xet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-100 bg-white">
                    {history.length ? (
                      history.map((item) => (
                        <tr key={item.weekLabel || item.weekNumber || item.week}>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {item.weekLabel || `Tuan ${item.weekNumber ?? item.week}`}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {parseNumber(item.softSkillScore ?? item.finalScore ?? item.score, 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.level || levelFromScore(parseNumber(item.softSkillScore ?? item.finalScore ?? item.score, 0))}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{item.comment || item.teacherComment || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                          Chua co lich su danh gia.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          );

          const renderNotifications = () => (
            <section className="rounded-[28px] border border-violet-100 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(76,29,149,0.35)]">
              <h3 className="text-lg font-extrabold text-slate-900">Thong bao</h3>
              <div className="mt-4 grid gap-3">
                {notifications.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-violet-100 bg-white px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                      <span className="text-xs font-semibold text-violet-600">{item.type}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{item.time}</p>
                  </div>
                ))}
              </div>
            </section>
          );

          const renderProfile = () => (
            <section className="grid gap-6 xl:grid-cols-2">
              <article className="rounded-[28px] border border-violet-100 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(76,29,149,0.35)]">
                <h3 className="text-lg font-extrabold text-slate-900">Ho so ca nhan</h3>
                <div className="mt-4 grid gap-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between rounded-2xl bg-violet-50 px-4 py-3">
                    <span>Ho ten</span>
                    <span className="font-semibold text-slate-800">{student.name}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-violet-50 px-4 py-3">
                    <span>Email</span>
                    <span className="font-semibold text-slate-800">{student.email || 'student@softskills.edu.vn'}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-violet-50 px-4 py-3">
                    <span>Lop</span>
                    <span className="font-semibold text-slate-800">{student.className || 'KTPM2022'}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-violet-50 px-4 py-3">
                    <span>Giang vien phu trach</span>
                    <span className="font-semibold text-slate-800">{student.teacherName || 'Nguyen Van A'}</span>
                  </div>
                </div>
              </article>
              <article className="rounded-[28px] border border-violet-100 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(76,29,149,0.35)]">
                <h3 className="text-lg font-extrabold text-slate-900">Cap nhat tai khoan</h3>
                <div className="mt-4 grid gap-3">
                  <input className="rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm" placeholder="Ho ten" />
                  <input className="rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm" placeholder="Email" />
                  <input className="rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm" placeholder="Mat khau moi" />
                  <button className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white">Cap nhat</button>
                </div>
              </article>
            </section>
          );

          const mainContent = () => {
            switch (activeMenu) {
              case 0:
                return renderOverview();
              case 1:
                return renderResults();
              case 2:
                return renderProgress();
              case 3:
                return renderRecommendation();
              case 4:
                return renderHistory();
              case 5:
                return renderNotifications();
              case 6:
                return renderProfile();
              default:
                return renderOverview();
            }
          };

          return (
            <DashboardFrame
              role="student"
              title={STUDENT_MENU[activeMenu] || 'Tong quan ca nhan'}
              subtitle={`Chao mung, ${student.name}.`}
              user={user || { name: student.name }}
              onLogout={onLogout}
              menuItems={STUDENT_MENU.map((label, index) => ({
                label,
                active: index === activeMenu,
                onClick: () => setActiveMenu(index),
              }))}
              headerControls={
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
                  {student.semester}
                </div>
              }
              rightNotes={[]}
            >
              {mainContent()}
            </DashboardFrame>
          );
};

export default StudentPage;
