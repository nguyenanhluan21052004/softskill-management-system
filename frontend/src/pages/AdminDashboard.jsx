import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import DashboardFrame from '../components/dashboard/DashboardFrame';
import ErrorState from '../components/ui/ErrorState';
import Spinner from '../components/ui/Spinner';
import {
  getAdminStudents,
  getAdminTeachers,
  getAdminEvaluations,
  getClassrooms,
  getResults,
  importExcel,
} from '../services/api';

const ADMIN_MENU = [
  'Tong quan',
  'Quan ly nguoi dung',
  'Quan ly giang vien',
  'Quan ly sinh vien',
  'Quan ly lop hoc',
  'Quan ly danh gia',
  'Bao cao & Thong ke',
  'Cai dat he thong',
];

const SKILL_KEYS = [
  { key: 'communication', label: 'Giao tiep', color: '#2563eb' },
  { key: 'teamwork', label: 'Lam viec nhom', color: '#22c55e' },
  { key: 'criticalThinking', label: 'Tu duy phan bien', color: '#f59e0b' },
  { key: 'timeManagement', label: 'Quan ly thoi gian', color: '#8b5cf6' },
];

const LEVEL_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

const average = (items) => {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + item, 0) / items.length;
};

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const levelFromScore = (score) => {
  if (score >= 8) return 'Tot';
  if (score < 6.5) return 'Yeu';
  return 'Trung binh';
};

const normalizeResults = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items.map((item, index) => {
    const score = parseNumber(item.score ?? item.result ?? item.softSkillScore, 0);
    return {
      id: item.id || item.studentId || `student-${index + 1}`,
      name: item.name || item.studentName || `Sinh vien ${index + 1}`,
      className: item.className || item.class || item.classroom || 'Chua phan lop',
      score,
      level: item.level || levelFromScore(score),
      communication: parseNumber(item.communication ?? item.communicationScore, score),
      teamwork: parseNumber(item.teamwork ?? item.teamworkScore, score),
      criticalThinking: parseNumber(item.criticalThinking ?? item.criticalThinkingScore, score),
      timeManagement: parseNumber(item.timeManagement ?? item.timeManagementScore, score),
    };
  });
};

const AdminDashboard = ({ user, onLogout }) => {
  const [activeMenu, setActiveMenu] = useState(0);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [results, setResults] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('All');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [classSearch, setClassSearch] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const [teachersResponse, studentsResponse, classroomsResponse, resultsResponse, evaluationResponse] = await Promise.all([
          getAdminTeachers(),
          getAdminStudents(),
          getClassrooms(),
          getResults(),
          getAdminEvaluations(),
        ]);

        setTeachers(Array.isArray(teachersResponse?.data) ? teachersResponse.data : []);
        setStudents(Array.isArray(studentsResponse?.data) ? studentsResponse.data : []);
        setClassrooms(Array.isArray(classroomsResponse?.data) ? classroomsResponse.data : []);
        setResults(normalizeResults(resultsResponse?.data));
        setEvaluations(Array.isArray(evaluationResponse?.data) ? evaluationResponse.data : []);
      } catch (requestError) {
        const apiMessage = requestError?.response?.data?.message || requestError?.response?.data;
        setError(apiMessage || 'Khong the tai du lieu dashboard admin.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const skillChartData = useMemo(() => {
    return SKILL_KEYS.map((skill) => ({
      name: skill.label,
      value: Number(
        average(results.map((item) => parseNumber(item[skill.key], item.score))).toFixed(2)
      ),
      color: skill.color,
    }));
  }, [results]);

  const users = useMemo(() => {
    const teacherUsers = teachers.map((item, index) => ({
      id: item.id || `teacher-${index + 1}`,
      name: item.name || item.teacherName || 'Giang vien',
      username: item.username || item.userName || `teacher${index + 1}`,
      email: item.email || item.mail || `teacher${index + 1}@softskills.edu.vn`,
      role: 'Giang vien',
      status: item.status || 'Dang hoat dong',
      createdAt: item.createdAt || '12/02/2025',
    }));

    const studentUsers = students.map((item, index) => ({
      id: item.id || `student-${index + 1}`,
      name: item.name || item.studentName || 'Sinh vien',
      username: item.username || item.userName || `student${index + 1}`,
      email: item.email || item.mail || `student${index + 1}@softskills.edu.vn`,
      role: 'Sinh vien',
      status: item.status || 'Dang hoat dong',
      createdAt: item.createdAt || '20/02/2025',
    }));

    return [...teacherUsers, ...studentUsers];
  }, [teachers, students]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    return users.filter((item) => {
      const matchRole = userRole === 'All' || item.role === userRole;
      const matchQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.username.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query);
      return matchRole && matchQuery;
    });
  }, [users, userRole, userSearch]);

  const filteredTeachers = useMemo(() => {
    const query = teacherSearch.trim().toLowerCase();
    return teachers
      .map((item, index) => ({
        id: item.id || `teacher-${index + 1}`,
        name: item.name || item.teacherName || 'Giang vien',
        email: item.email || item.mail || `teacher${index + 1}@softskills.edu.vn`,
        department: item.department || item.faculty || 'Khoa CNTT',
        classes: item.classCount || item.classes || item.classrooms?.length || 0,
        status: item.status || 'Dang hoat dong',
      }))
      .filter((item) =>
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query) ||
        String(item.department).toLowerCase().includes(query)
      );
  }, [teachers, teacherSearch]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    return students
      .map((item, index) => ({
        id: item.id || item.studentId || `SV${String(index + 1).padStart(3, '0')}`,
        name: item.name || item.studentName || 'Sinh vien',
        className: item.className || item.class || item.classroom || 'Chua phan lop',
        teacher: item.teacherName || item.teacher || 'Nguyen Van A',
        averageScore: parseNumber(item.score ?? item.result ?? 0, 0),
        level: item.level || levelFromScore(parseNumber(item.score ?? item.result ?? 0, 0)),
      }))
      .filter((item) =>
        !query ||
        item.name.toLowerCase().includes(query) ||
        String(item.id).toLowerCase().includes(query) ||
        item.className.toLowerCase().includes(query)
      );
  }, [students, studentSearch]);

  const filteredClasses = useMemo(() => {
    const query = classSearch.trim().toLowerCase();
    return classrooms
      .map((item, index) => ({
        id: item.id || `class-${index + 1}`,
        code: item.code || item.classCode || item.name || `Lop ${index + 1}`,
        name: item.name || item.className || item.code || `Lop ${index + 1}`,
        teacher: item.teacherName || item.teacher || 'Chua phan cong',
        totalStudents: item.totalStudents || item.size || 0,
        semester: item.semester || 'Hoc ky 2',
        year: item.year || '2024-2025',
      }))
      .filter((item) =>
        !query ||
        item.code.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query)
      );
  }, [classrooms, classSearch]);

  const evaluationRows = useMemo(() => {
    if (!evaluations.length) {
      return [];
    }

    const studentMap = new Map(
      students.map((item) => [String(item.id || item.studentId), item.name || item.studentName])
    );

    return evaluations.slice(0, 12).map((item, index) => {
      const studentName = studentMap.get(String(item.studentId)) || `Sinh vien ${item.studentId || index + 1}`;
      return {
        id: item.evaluationId || item.id || `eval-${index + 1}`,
        student: studentName,
        teacher: item.evaluatorName || item.teacherName || `GV ${item.evaluatorId || index + 1}`,
        week: item.weekLabel || `Tuan ${item.weekNumber || index + 1}`,
        score: parseNumber(item.finalScore ?? item.score, 0).toFixed(2),
        level: item.level || levelFromScore(parseNumber(item.finalScore ?? item.score, 0)),
        date: item.evaluationDate ? new Date(item.evaluationDate).toLocaleDateString('vi-VN') : '20/04/2025',
      };
    });
  }, [evaluations, students]);

  const reportTrend = useMemo(() => {
    const base = [6.2, 6.6, 6.95, 7.2, 7.4, 7.65];
    return base.map((score, index) => ({
      label: `T${index + 1}/2025`,
      score,
      support: Math.max(5, 18 - index * 2),
    }));
  }, []);

  const levelChartData = useMemo(() => {
    const levels = ['Tot', 'Trung binh', 'Yeu'];
    return levels.map((level) => ({
      name: level,
      value: results.filter((item) => levelFromScore(parseNumber(item.score)) === level || item.level === level).length,
    }));
  }, [results]);

  const topClasses = useMemo(() => {
    const groups = results.reduce((acc, item) => {
      const className = item.className || 'Chua phan lop';
      if (!acc[className]) {
        acc[className] = [];
      }
      acc[className].push(item);
      return acc;
    }, {});

    return Object.entries(groups)
      .map(([className, members]) => ({
        className,
        averageScore: average(members.map((member) => member.score)),
        totalStudents: members.length,
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 5);
  }, [results]);

  const activityRows = useMemo(() => {
    return [
      `${teachers.length} giang vien dang hoat dong trong he thong`,
      `${students.length} sinh vien da duoc dong bo du lieu`,
      `${classrooms.length} lop hoc da cau hinh thanh cong`,
      `${results.length} ban ghi danh gia san sang de bao cao`,
    ];
  }, [teachers.length, students.length, classrooms.length, results.length]);

  const handleImport = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Vui long chon tep Excel truoc khi tai len.');
      return;
    }

    setUploading(true);
    setMessage('');
    setError('');
    try {
      await importExcel(selectedFile);
      setMessage('Nhap du lieu Excel thanh cong.');
    } catch (requestError) {
      const apiMessage = requestError?.response?.data?.message || requestError?.response?.data;
      setError(apiMessage || 'Nhap du lieu that bai.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <Spinner label="Dang tai dashboard admin..." />;
  }

  if (error && results.length === 0 && teachers.length === 0 && students.length === 0) {
    return <ErrorState message={error} />;
  }

  const renderOverview = () => (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Tong so nguoi dung', value: teachers.length + students.length, color: 'bg-blue-500' },
          { label: 'Giang vien', value: teachers.length, color: 'bg-emerald-500' },
          { label: 'Sinh vien', value: students.length, color: 'bg-violet-500' },
          { label: 'Lop hoc', value: classrooms.length, color: 'bg-orange-500' },
        ].map((item) => (
          <article
            key={item.label}
            className="rounded-[26px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]"
          >
            <div className={`h-2 w-14 rounded-full ${item.color}`} />
            <p className="mt-4 text-sm font-semibold text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{item.value}</p>
            <p className="mt-1 text-xs text-emerald-600">So lieu cap nhat tu he thong</p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
          <h3 className="text-lg font-extrabold text-slate-900">Thong ke danh gia theo ky nang</h3>
          <div className="mt-4 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillChartData}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 10]} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                  {skillChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
          <h3 className="text-lg font-extrabold text-slate-900">Phan bo xep loai</h3>
          <div className="mt-4 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={levelChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={4}
                >
                  {levelChartData.map((entry, index) => (
                    <Cell key={entry.name} fill={LEVEL_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-2">
            {levelChartData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: LEVEL_COLORS[index] }} />
                  {item.name}
                </div>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
          <h3 className="text-lg font-extrabold text-slate-900">Hoat dong he thong</h3>
          <div className="mt-4 grid gap-3">
            {activityRows.map((item, index) => (
              <div key={item} className="flex items-start justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex gap-3">
                  <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {index + 1}
                  </span>
                  <p className="text-sm text-slate-700">{item}</p>
                </div>
                <span className="text-xs font-semibold text-slate-400">vua cap nhat</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
          <h3 className="text-lg font-extrabold text-slate-900">Top 5 lop co diem trung binh cao nhat</h3>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Lop</th>
                  <th className="px-4 py-3">Diem TB</th>
                  <th className="px-4 py-3">Sinh vien</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {topClasses.map((item) => (
                  <tr key={item.className}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.className}</td>
                    <td className="px-4 py-3 text-slate-600">{item.averageScore.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-600">{item.totalStudents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-[28px] border border-slate-200/70 bg-white/95 p-5 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Cap nhat du lieu danh gia</h3>
            <p className="mt-1 text-sm text-slate-500">Nhap tep Excel de dong bo nhanh du lieu cho hoi dong bao ve.</p>
          </div>
          <form onSubmit={handleImport} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
            />
            <button
              type="submit"
              disabled={uploading}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? 'Dang xu ly...' : 'Nhap Excel'}
            </button>
          </form>
        </div>
        {message ? <p className="mt-4 text-sm font-semibold text-emerald-600">{message}</p> : null}
        {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
      </section>
    </>
  );

  const renderUserManagement = () => (
    <section className="grid gap-6">
      <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Danh sach nguoi dung</h3>
            <p className="mt-1 text-sm text-slate-500">Quan ly tai khoan, vai tro va trang thai hoat dong.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Them user</button>
            <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
              Xuat Excel
            </button>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Tim theo ten, email, username"
            className="h-11 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm"
          />
          <select
            value={userRole}
            onChange={(event) => setUserRole(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
          >
            <option value="All">Tat ca vai tro</option>
            <option value="Giang vien">Giang vien</option>
            <option value="Sinh vien">Sinh vien</option>
          </select>
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Trang thai</th>
                <th className="px-4 py-3">Ngay tao</th>
                <th className="px-4 py-3">Thao tac</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredUsers.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.username}</td>
                  <td className="px-4 py-3 text-slate-600">{item.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {item.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.status}</td>
                  <td className="px-4 py-3 text-slate-600">{item.createdAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Chinh sua
                      </button>
                      <button className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                        Xoa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );

  const renderTeacherManagement = () => (
    <section className="grid gap-6">
      <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Danh sach giang vien</h3>
            <p className="mt-1 text-sm text-slate-500">Theo doi bo mon, lop phu trach va trang thai.</p>
          </div>
          <button className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Them giang vien</button>
        </div>
        <div className="mt-5">
          <input
            value={teacherSearch}
            onChange={(event) => setTeacherSearch(event.target.value)}
            placeholder="Tim theo ten, email, bo mon"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm"
          />
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Ho ten</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Bo mon</th>
                <th className="px-4 py-3">So lop</th>
                <th className="px-4 py-3">Trang thai</th>
                <th className="px-4 py-3">Thao tac</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredTeachers.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.email}</td>
                  <td className="px-4 py-3 text-slate-600">{item.department}</td>
                  <td className="px-4 py-3 text-slate-600">{item.classes}</td>
                  <td className="px-4 py-3 text-slate-600">{item.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Cap nhat
                      </button>
                      <button className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                        Xoa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );

  const renderStudentManagement = () => (
    <section className="grid gap-6">
      <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Danh sach sinh vien</h3>
            <p className="mt-1 text-sm text-slate-500">Quan ly thong tin, diem trung binh va xep loai.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Them sinh vien</button>
            <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
              Export Excel
            </button>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={studentSearch}
            onChange={(event) => setStudentSearch(event.target.value)}
            placeholder="Tim theo ten, ma sinh vien, lop"
            className="h-11 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm"
          />
          <button className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600">
            Import Excel
          </button>
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Ho ten</th>
                <th className="px-4 py-3">Ma SV</th>
                <th className="px-4 py-3">Lop</th>
                <th className="px-4 py-3">GV phu trach</th>
                <th className="px-4 py-3">Diem TB</th>
                <th className="px-4 py-3">Xep loai</th>
                <th className="px-4 py-3">Thao tac</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredStudents.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.id}</td>
                  <td className="px-4 py-3 text-slate-600">{item.className}</td>
                  <td className="px-4 py-3 text-slate-600">{item.teacher}</td>
                  <td className="px-4 py-3 text-slate-600">{item.averageScore.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                      {item.level}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Chinh sua
                      </button>
                      <button className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                        Xoa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );

  const renderClassManagement = () => (
    <section className="grid gap-6">
      <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Danh sach lop hoc</h3>
            <p className="mt-1 text-sm text-slate-500">Quan ly lop, hoc ky va phan cong giang vien.</p>
          </div>
          <div className="flex gap-3">
            <button className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Them lop</button>
            <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
              Phan cong giang vien
            </button>
          </div>
        </div>
        <div className="mt-5">
          <input
            value={classSearch}
            onChange={(event) => setClassSearch(event.target.value)}
            placeholder="Tim theo ma lop, ten lop"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm"
          />
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Ma lop</th>
                <th className="px-4 py-3">Ten lop</th>
                <th className="px-4 py-3">GV chu nhiem</th>
                <th className="px-4 py-3">So SV</th>
                <th className="px-4 py-3">Hoc ky</th>
                <th className="px-4 py-3">Nam hoc</th>
                <th className="px-4 py-3">Thao tac</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredClasses.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{item.code}</td>
                  <td className="px-4 py-3 text-slate-600">{item.name}</td>
                  <td className="px-4 py-3 text-slate-600">{item.teacher}</td>
                  <td className="px-4 py-3 text-slate-600">{item.totalStudents}</td>
                  <td className="px-4 py-3 text-slate-600">{item.semester}</td>
                  <td className="px-4 py-3 text-slate-600">{item.year}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Cap nhat
                      </button>
                      <button className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                        Xoa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );

  const renderEvaluationManagement = () => (
    <section className="grid gap-6">
      <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Danh sach danh gia</h3>
            <p className="mt-1 text-sm text-slate-500">Theo doi tien do danh gia cua giang vien.</p>
          </div>
          <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
            Loc theo tuan
          </button>
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Sinh vien</th>
                <th className="px-4 py-3">Giang vien</th>
                <th className="px-4 py-3">Tuan</th>
                <th className="px-4 py-3">Diem tong</th>
                <th className="px-4 py-3">Xep loai</th>
                <th className="px-4 py-3">Ngay danh gia</th>
                <th className="px-4 py-3">Thao tac</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {evaluationRows.length ? (
                evaluationRows.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.student}</td>
                    <td className="px-4 py-3 text-slate-600">{item.teacher}</td>
                    <td className="px-4 py-3 text-slate-600">{item.week}</td>
                    <td className="px-4 py-3 text-slate-600">{item.score}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {item.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.date}</td>
                    <td className="px-4 py-3">
                      <button className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Xem chi tiet
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                    Chua co du lieu danh gia.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );

  const renderReports = () => (
    <section className="grid gap-6">
      <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Bao cao & thong ke</h3>
            <p className="mt-1 text-sm text-slate-500">Phan tich xu huong va nhom sinh vien can ho tro som.</p>
          </div>
          <div className="flex gap-3">
            <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
              Export Excel
            </button>
            <button className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Export PDF</button>
          </div>
        </div>
        <div className="mt-5 grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Xu huong diem trung binh</p>
            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportTrend}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 10]} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Ti le sinh vien can ho tro som</p>
            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportTrend}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 20]} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="support" stroke="#f97316" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </article>
    </section>
  );

  const renderSettings = () => (
    <section className="grid gap-6">
      <article className="rounded-[28px] border border-slate-200/70 bg-white/95 p-6 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.45)]">
        <h3 className="text-lg font-extrabold text-slate-900">Cau hinh he thong</h3>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-700">Trong so danh gia</p>
            <div className="mt-4 grid gap-3">
              {SKILL_KEYS.map((skill) => (
                <label key={skill.key} className="flex items-center justify-between text-sm text-slate-600">
                  <span>{skill.label}</span>
                  <input
                    defaultValue={(skill.key === 'teamwork' ? 0.3 : 0.25).toFixed(2)}
                    className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-sm"
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-700">Cau hinh hoc ky</p>
            <div className="mt-4 grid gap-3">
              <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" defaultValue="Hoc ky 2" />
              <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" defaultValue="2024-2025" />
              <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Cap nhat
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-700">Cau hinh phan quyen</p>
            <div className="mt-4 grid gap-3">
              {['Admin', 'Giang vien', 'Sinh vien'].map((role) => (
                <label key={role} className="flex items-center justify-between text-sm text-slate-600">
                  <span>{role}</span>
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-700">Doi mat khau admin</p>
            <div className="mt-4 grid gap-3">
              <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Mat khau hien tai" />
              <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Mat khau moi" />
              <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                Cap nhat mat khau
              </button>
            </div>
          </div>
        </div>
      </article>
    </section>
  );

  const mainContent = () => {
    switch (activeMenu) {
      case 0:
        return renderOverview();
      case 1:
        return renderUserManagement();
      case 2:
        return renderTeacherManagement();
      case 3:
        return renderStudentManagement();
      case 4:
        return renderClassManagement();
      case 5:
        return renderEvaluationManagement();
      case 6:
        return renderReports();
      case 7:
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  return (
    <DashboardFrame
      role="admin"
      title={ADMIN_MENU[activeMenu] || 'Tong quan he thong'}
      subtitle="Chao mung ban tro lai, Admin."
      user={user}
      onLogout={onLogout}
      menuItems={ADMIN_MENU.map((label, index) => ({
        label,
        active: index === activeMenu,
        onClick: () => setActiveMenu(index),
      }))}
      headerControls={
        <>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
            01/06/2025 - 31/05/2026
          </div>
          <button
            type="button"
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700"
          >
            Xuat bao cao
          </button>
        </>
      }
      rightNotes={[]}
    >
      {mainContent()}
    </DashboardFrame>
  );
};

export default AdminDashboard;
