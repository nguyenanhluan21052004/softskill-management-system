import React, { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import DashboardFrame from '../components/dashboard/DashboardFrame';
import ErrorState from '../components/ui/ErrorState';
import Spinner from '../components/ui/Spinner';
import {
  getClassrooms,
  getCurrentTeacher,
  getStudentEvaluations,
  saveStudentEvaluation,
  updateTeacherPassword,
  updateTeacherProfile,
} from '../services/api';

const TEACHER_SECTIONS = [
  { key: 'overview', label: 'Tong quan' },
  { key: 'classes', label: 'Danh sach lop' },
  { key: 'evaluation', label: 'Danh gia sinh vien' },
  { key: 'results', label: 'Ket qua lop' },
  { key: 'reports', label: 'Bao cao' },
  { key: 'notifications', label: 'Thong bao' },
  { key: 'profile', label: 'Ho so ca nhan' },
];

const WEEK_OPTIONS = [
  { value: '1', label: 'Tuan 1', order: 1 },
  { value: '4', label: 'Tuan 4', order: 4 },
  { value: '8', label: 'Tuan 8', order: 8 },
  { value: '16', label: 'Cuoi ky', order: 16 },
];

const SEMESTER_OPTIONS = ['Hoc ky 1 (2024-2025)', 'Hoc ky 2 (2024-2025)'];
const REPORT_MODES = ['Bao cao theo lop', 'Bao cao theo tuan', 'Bao cao theo hoc ky'];
const RESULT_FILTERS = ['Tat ca', 'Tot', 'Kha', 'Can chu y'];
const NOTIFICATION_FILTERS = ['Tat ca', 'Admin', 'Lich danh gia', 'Deadline', 'Canh bao'];

const SKILL_META = [
  { key: 'communication', label: 'Giao tiep', color: '#2563eb' },
  { key: 'teamwork', label: 'Lam viec nhom', color: '#22c55e' },
  { key: 'criticalThinking', label: 'Tu duy phan bien', color: '#f59e0b' },
  { key: 'timeManagement', label: 'Quan ly thoi gian', color: '#8b5cf6' },
];

const LEVEL_COLORS = {
  Tot: '#22c55e',
  Kha: '#f59e0b',
  'Can chu y': '#ef4444',
};

const panelClassName =
  'rounded-[28px] border border-emerald-100 bg-white/95 p-5 shadow-[0_18px_50px_-35px_rgba(6,95,70,0.35)]';
const inputClassName =
  'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100';
const selectClassName =
  'h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100';
const primaryButtonClassName =
  'rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-600';
const secondaryButtonClassName =
  'rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50';

const defaultEvaluationForm = {
  attendance: '8',
  assignment: '8',
  presentation: '8',
  project: '8',
  peerReview: '8',
  teamContribution: '8',
  comment: '',
};

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const average = (items) => {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + item, 0) / items.length;
};

const levelFromScore = (score) => {
  if (score >= 8) return 'Tot';
  if (score < 6.5) return 'Can chu y';
  return 'Kha';
};

const buildSkillScore = (metrics) => {
  const attendance = clamp(parseNumber(metrics.attendance), 0, 10);
  const assignment = clamp(parseNumber(metrics.assignment), 0, 10);
  const presentation = clamp(parseNumber(metrics.presentation), 0, 10);
  const project = clamp(parseNumber(metrics.project), 0, 10);
  const peerReview = clamp(parseNumber(metrics.peerReview), 0, 10);
  const teamContribution = clamp(parseNumber(metrics.teamContribution), 0, 10);

  const communication = clamp(presentation * 0.45 + peerReview * 0.3 + assignment * 0.25, 0, 10);
  const teamwork = clamp(teamContribution * 0.45 + project * 0.3 + peerReview * 0.25, 0, 10);
  const criticalThinking = clamp(project * 0.45 + assignment * 0.35 + presentation * 0.2, 0, 10);
  const timeManagement = clamp(attendance * 0.4 + assignment * 0.3 + project * 0.3, 0, 10);
  const softSkillScore = clamp(
    communication * 0.25 + teamwork * 0.3 + criticalThinking * 0.25 + timeManagement * 0.2,
    0,
    10
  );

  return {
    attendance,
    assignment,
    presentation,
    project,
    peerReview,
    teamContribution,
    communication,
    teamwork,
    criticalThinking,
    timeManagement,
    softSkillScore,
    level: levelFromScore(softSkillScore),
  };
};

const normalizeEvaluationHistory = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items.map((item, index) => {
    const weekNumber =
      item.weekNumber ??
      item.WeekNumber ??
      item.weekOrder ??
      item.week ??
      index + 1;
    const finalScore = parseNumber(
      item.finalScore ?? item.FinalScore ?? item.softSkillScore ?? item.score ?? item.totalScore ?? item.TotalScore,
      0
    );
    const level = item.level || item.Level || item.rank || item.Rank || levelFromScore(finalScore);

    return {
      ...item,
      weekNumber,
      week: weekNumber,
      weekLabel: item.weekLabel || `Tuan ${weekNumber}`,
      softSkillScore: finalScore,
      score: finalScore,
      level,
      communication: parseNumber(item.communication ?? item.Communication ?? item.communicationScore, NaN),
      teamwork: parseNumber(item.teamwork ?? item.Teamwork ?? item.teamworkScore, NaN),
      criticalThinking: parseNumber(item.criticalThinking ?? item.CriticalThinking ?? item.criticalThinkingScore, NaN),
      timeManagement: parseNumber(item.timeManagement ?? item.TimeManagement ?? item.timeManagementScore, NaN),
      attendance: item.attendance ?? item.Attendance,
      assignment: item.assignment ?? item.Assignment,
      presentation: item.presentation ?? item.Presentation,
      project: item.project ?? item.Project,
      peerReview: item.peerReview ?? item.PeerReview,
      teamContribution: item.teamContribution ?? item.TeamContribution,
    };
  });
};

const computeWeakestSkill = (student) => {
  const scores = SKILL_META.map((skill) => ({
    key: skill.key,
    label: skill.label,
    value: parseNumber(student[skill.key], student.score),
  }));
  scores.sort((a, b) => a.value - b.value);
  return scores[0];
};

const normalizeStudents = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => !/^teacher\b/i.test(String(item.name || item.studentName || '').trim()))
    .map((item, index) => {
      const score = parseNumber(item.score ?? item.result ?? item.softSkillScore, 0);
      return {
        id: item.id || item.studentId || `sv-${index + 1}`,
        name: item.name || item.studentName || `Sinh vien ${index + 1}`,
        className: item.classCode || item.className || item.class || item.classroom || 'Chua phan lop',
        score,
        level: item.level || levelFromScore(score),
        communication: parseNumber(item.communication ?? item.communicationScore, score),
        teamwork: parseNumber(item.teamwork ?? item.teamworkScore, score),
        criticalThinking: parseNumber(item.criticalThinking ?? item.criticalThinkingScore, score),
        timeManagement: parseNumber(item.timeManagement ?? item.timeManagementScore, score),
        attendance: parseNumber(item.attendance ?? item.attendanceScore, 7),
        assignment: parseNumber(item.assignment ?? item.assignmentScore, 7),
        presentation: parseNumber(item.presentation ?? item.presentationScore, 7),
        project: parseNumber(item.project ?? item.projectScore, 7),
        peerReview: parseNumber(item.peerReview ?? item.peerReviewScore, 7),
        teamContribution: parseNumber(item.teamContribution ?? item.contributionScore, 7),
      };
    });
};

const buildClassSummaries = (classrooms, students, selectedSemester) => {
  const grouped = students.reduce((acc, student) => {
    const key = student.className || 'Chua phan lop';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(student);
    return acc;
  }, {});

  const classroomMap = new Map(
    (Array.isArray(classrooms) ? classrooms : []).map((item) => [
      String(item.code || item.classCode || item.name),
      item,
    ])
  );

  const summaryCodes = new Set([
    ...Object.keys(grouped),
    ...(Array.isArray(classrooms) ? classrooms.map((item) => String(item.code || item.classCode || item.name)) : []),
  ]);

  return [...summaryCodes]
    .filter(Boolean)
    .map((code) => {
      const classroom = classroomMap.get(code) || {};
      const members = grouped[code] || [];
      const evaluated = members.filter((student) => student.score > 0).length;
      const totalStudents = members.length;
      const completionRate = totalStudents > 0 ? Math.round((evaluated / totalStudents) * 100) : 0;
      const averageScore = average(members.map((student) => student.score));

      return {
        code,
        name: classroom.name || classroom.className || `Lop ${code}`,
        totalStudents,
        semester: classroom.semester || selectedSemester,
        schoolYear: classroom.schoolYear || '2024-2025',
        averageScore,
        evaluated,
        completionRate,
        status:
          completionRate === 100 ? 'Hoan thanh' : completionRate >= 60 ? 'Dang danh gia' : 'Chua hoan thanh',
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
};

const downloadSpreadsheet = (filename, columns, rows) => {
  if (typeof window === 'undefined') return;

  const header = columns.join('\t');
  const body = rows.map((row) => row.map((cell) => `${cell}`).join('\t')).join('\n');
  const blob = new Blob([`${header}\n${body}`], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

const printReport = (title, sections) => {
  if (typeof window === 'undefined') return;

  const popup = window.open('', '_blank', 'width=1000,height=720');
  if (!popup) return;

  popup.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
          h1 { margin: 0 0 24px; }
          h2 { margin: 24px 0 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
          th { background: #f8fafc; }
          p { line-height: 1.6; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${sections
          .map(
            (section) => `
              <h2>${section.title}</h2>
              ${section.content}
            `
          )
          .join('')}
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
};

const SectionPanel = ({ title, subtitle, action, children, className = '' }) => (
  <section className={`${panelClassName} ${className}`}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
    <div className="mt-4">{children}</div>
  </section>
);

const SummaryCard = ({ label, value, note }) => (
  <article className="rounded-[26px] border border-emerald-100 bg-white/95 p-5 shadow-[0_18px_50px_-35px_rgba(6,95,70,0.35)]">
    <p className="text-sm font-semibold text-slate-500">{label}</p>
    <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
    <p className="mt-1 text-xs text-emerald-600">{note}</p>
  </article>
);

const TeacherDashboard = ({ user, onLogout }) => {
  const [teacherProfile, setTeacherProfile] = useState({
    id: null,
    name: user?.name || 'Giang vien',
    email: '',
    department: 'Bo mon Cong nghe thong tin',
  });
  const [students, setStudents] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(SEMESTER_OPTIONS[1]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(WEEK_OPTIONS[0].value);
  const [evaluationForm, setEvaluationForm] = useState(defaultEvaluationForm);
  const [studentHistory, setStudentHistory] = useState([]);
  const [savingEvaluation, setSavingEvaluation] = useState(false);
  const [evaluationMessage, setEvaluationMessage] = useState('');
  const [resultSearch, setResultSearch] = useState('');
  const [resultFilter, setResultFilter] = useState(RESULT_FILTERS[0]);
  const [reportMode, setReportMode] = useState(REPORT_MODES[0]);
  const [notifications, setNotifications] = useState([]);
  const [notificationFilter, setNotificationFilter] = useState(NOTIFICATION_FILTERS[0]);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || 'Giang vien',
    email: '',
    department: 'Bo mon Cong nghe thong tin',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const deferredResultSearch = useDeferredValue(resultSearch);

  useEffect(() => {
    const loadTeacherDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const [teacherResponse, classroomResponse] = await Promise.all([getCurrentTeacher(), getClassrooms()]);
        const teacherData = teacherResponse?.data || {};
        const normalizedStudents = normalizeStudents(teacherData.students || teacherData.results || teacherData.items || []);
        const classroomList = Array.isArray(classroomResponse?.data) ? classroomResponse.data : [];
        const teacherId = teacherData.teacherId || teacherData.id || teacherData.userId || null;
        const teacherName =
          teacherData.teacherName || teacherData.name || teacherData.fullName || user?.name || 'Giang vien';
        const teacherEmail =
          teacherData.email ||
          teacherData.username ||
          `${teacherName.toLowerCase().replace(/\s+/g, '.')}@university.edu.vn`;
        const storedDepartment =
          typeof window !== 'undefined' && teacherId
            ? window.localStorage.getItem(`ss_teacher_department_${teacherId}`)
            : null;
        const teacherDepartment = storedDepartment || teacherData.department || teacherData.faculty || 'Bo mon Cong nghe thong tin';

        setStudents(normalizedStudents);
        setClassrooms(classroomList);
        setTeacherProfile({
          id: teacherId,
          name: teacherName,
          email: teacherEmail,
          department: teacherDepartment,
        });
        setProfileForm({
          name: teacherName,
          email: teacherEmail,
          department: teacherDepartment,
        });

        const derivedClasses = buildClassSummaries(classroomList, normalizedStudents, selectedSemester);
        const initialClass = derivedClasses[0]?.code || normalizedStudents[0]?.className || 'CNTT-K17A';
        setSelectedClass(initialClass);
        setSelectedStudentId(normalizedStudents.find((student) => student.className === initialClass)?.id || normalizedStudents[0]?.id || '');

        const attentionStudent =
          normalizedStudents.find((student) => student.score < 6.5 || student.attendance < 6.5) || normalizedStudents[0];
        setNotifications([
          {
            id: 'noti-1',
            type: 'Admin',
            title: 'Thong bao tu Admin',
            message: 'He thong mo phien nhap diem hoc ky moi. Vui long cap nhat du lieu truoc thu Sau.',
            time: '10 phut truoc',
            read: false,
          },
          {
            id: 'noti-2',
            type: 'Lich danh gia',
            title: `Lich danh gia lop ${initialClass}`,
            message: 'Can hoan tat danh gia tuan 8 cho cac nhom do an trong buoi hoc toi.',
            time: '1 gio truoc',
            read: false,
          },
          {
            id: 'noti-3',
            type: 'Deadline',
            title: 'Deadline nhap diem',
            message: 'Han cuoi nhap diem tong hop hoc ky la 17:00 ngay 20/06/2025.',
            time: 'Hom nay',
            read: true,
          },
          {
            id: 'noti-4',
            type: 'Canh bao',
            title: 'Sinh vien can ho tro som',
            message: `${attentionStudent?.name || 'Mot sinh vien'} dang co dau hieu cham tien do va can duoc theo doi sat hon.`,
            time: '2 gio truoc',
            read: false,
          },
        ]);
      } catch (requestError) {
        setError(requestError?.response?.data?.message || requestError?.message || 'Khong the tai dashboard giang vien.');
      } finally {
        setLoading(false);
      }
    };

    loadTeacherDashboard();
  }, [selectedSemester, user?.name]);

  const classSummaries = useMemo(
    () => buildClassSummaries(classrooms, students, selectedSemester),
    [classrooms, selectedSemester, students]
  );

  useEffect(() => {
    if (!selectedClass && classSummaries[0]?.code) {
      setSelectedClass(classSummaries[0].code);
    }
  }, [classSummaries, selectedClass]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => !selectedClass || student.className === selectedClass);
  }, [selectedClass, students]);

  useEffect(() => {
    if (!filteredStudents.length) {
      setSelectedStudentId('');
      return;
    }

    const selectedStillExists = filteredStudents.some((student) => String(student.id) === String(selectedStudentId));
    if (!selectedStillExists) {
      setSelectedStudentId(filteredStudents[0].id);
    }
  }, [filteredStudents, selectedStudentId]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!selectedStudentId) {
        setStudentHistory([]);
        return;
      }

      try {
        const response = await getStudentEvaluations(selectedStudentId);
        const records = normalizeEvaluationHistory(response?.data);
        const sorted = [...records].sort((a, b) => Number(a.weekNumber) - Number(b.weekNumber));
        setStudentHistory(sorted);
      } catch (_error) {
        setStudentHistory([]);
      }
    };

    loadHistory();
  }, [selectedStudentId]);

  useEffect(() => {
    const currentRecord = studentHistory.find((item) => String(item.weekNumber) === String(selectedWeek));
    if (currentRecord) {
      const hasRawMetrics = [
        currentRecord.attendance,
        currentRecord.assignment,
        currentRecord.presentation,
        currentRecord.project,
        currentRecord.peerReview,
        currentRecord.teamContribution,
      ].some((value) => value !== undefined && value !== null);

      if (hasRawMetrics) {
        setEvaluationForm({
          attendance: `${parseNumber(currentRecord.attendance, 8)}`,
          assignment: `${parseNumber(currentRecord.assignment, 8)}`,
          presentation: `${parseNumber(currentRecord.presentation, 8)}`,
          project: `${parseNumber(currentRecord.project, 8)}`,
          peerReview: `${parseNumber(currentRecord.peerReview, 8)}`,
          teamContribution: `${parseNumber(currentRecord.teamContribution, 8)}`,
          comment: currentRecord.comment || '',
        });
        return;
      }
    }

    setEvaluationForm(defaultEvaluationForm);
  }, [selectedWeek, studentHistory]);

  const currentStudent = useMemo(
    () => filteredStudents.find((student) => String(student.id) === String(selectedStudentId)),
    [filteredStudents, selectedStudentId]
  );

  const summary = useMemo(() => {
    const total = filteredStudents.length;
    const evaluated = filteredStudents.filter((student) => student.score > 0).length;
    const averageScore = average(filteredStudents.map((student) => student.score));
    return {
      total,
      evaluated,
      averageScore,
      level: levelFromScore(averageScore),
    };
  }, [filteredStudents]);

  const levelDistribution = useMemo(() => {
    return ['Tot', 'Kha', 'Can chu y'].map((level) => ({
      name: level,
      value: filteredStudents.filter((student) => (student.level || levelFromScore(student.score)) === level).length,
      color: LEVEL_COLORS[level],
    }));
  }, [filteredStudents]);

  const skillAverages = useMemo(() => {
    return SKILL_META.map((skill) => ({
      name: skill.label,
      value: Number(average(filteredStudents.map((student) => parseNumber(student[skill.key], student.score))).toFixed(2)),
      color: skill.color,
    }));
  }, [filteredStudents]);

  const attentionStudents = useMemo(() => {
    return [...filteredStudents]
      .map((student) => ({
        ...student,
        weakestSkill: computeWeakestSkill(student),
      }))
      .filter((student) => student.score < 7 || student.attendance < 6.5 || student.teamContribution < 6.5)
      .sort((a, b) => a.score - b.score)
      .slice(0, 6);
  }, [filteredStudents]);

  const recentEvaluationActivities = useMemo(() => {
    if (studentHistory.length > 0 && currentStudent) {
      return [...studentHistory]
        .slice(-4)
        .reverse()
        .map((item) => ({
          title: `Cap nhat ${item.weekLabel || `Tuan ${item.weekNumber}`} cho ${currentStudent.name}`,
          score: parseNumber(item.softSkillScore ?? item.score, 0).toFixed(2),
          level: item.level || levelFromScore(parseNumber(item.softSkillScore ?? item.score, 0)),
          time: item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('vi-VN') : 'Gan day',
        }));
    }

    return [
      {
        title: `Hoan tat tong hop danh gia cho lop ${selectedClass || 'hien tai'}`,
        score: summary.averageScore.toFixed(2),
        level: summary.level,
        time: 'Hom nay',
      },
      {
        title: 'He thong da cap nhat danh sach sinh vien can ho tro som',
        score: `${attentionStudents.length}`,
        level: 'Thong bao',
        time: '1 gio truoc',
      },
      {
        title: 'Bao cao hoc ky san sang de xuat file',
        score: `${summary.evaluated}/${summary.total}`,
        level: 'Tien do',
        time: 'Hom qua',
      },
    ];
  }, [attentionStudents.length, currentStudent, selectedClass, studentHistory, summary.averageScore, summary.evaluated, summary.level, summary.total]);

  const evaluationPreview = useMemo(() => buildSkillScore(evaluationForm), [evaluationForm]);

  const selectedWeekRecord = useMemo(
    () => studentHistory.find((item) => String(item.weekNumber) === String(selectedWeek)),
    [selectedWeek, studentHistory]
  );

  const historyChartData = useMemo(() => {
    if (studentHistory.length > 0) {
      return studentHistory.map((item) => ({
        label: item.weekLabel || `Tuan ${item.weekNumber}`,
        score: parseNumber(item.softSkillScore ?? item.score, 0),
      }));
    }

    const baseline = currentStudent?.score || 7;
    return [
      { label: 'Tuan 1', score: clamp(baseline - 1.1, 0, 10) },
      { label: 'Tuan 4', score: clamp(baseline - 0.6, 0, 10) },
      { label: 'Tuan 8', score: clamp(baseline - 0.2, 0, 10) },
      { label: 'Cuoi ky', score: clamp(baseline, 0, 10) },
    ];
  }, [currentStudent?.score, studentHistory]);

  const resultRows = useMemo(() => {
    return filteredStudents.map((student) => {
      const weakestSkill = computeWeakestSkill(student);
      const support = student.score < 7 || weakestSkill.value < 6.5;
      return {
        ...student,
        weakestSkill,
        support,
      };
    });
  }, [filteredStudents]);

  const filteredResultRows = useMemo(() => {
    const keyword = deferredResultSearch.trim().toLowerCase();

    return resultRows.filter((student) => {
      const matchesKeyword =
        !keyword ||
        student.name.toLowerCase().includes(keyword) ||
        student.className.toLowerCase().includes(keyword);
      const matchesLevel = resultFilter === 'Tat ca' || (student.level || levelFromScore(student.score)) === resultFilter;
      return matchesKeyword && matchesLevel;
    });
  }, [deferredResultSearch, resultFilter, resultRows]);

  const topStudents = useMemo(() => {
    return [...filteredResultRows].sort((a, b) => b.score - a.score).slice(0, 5);
  }, [filteredResultRows]);

  const supportStudents = useMemo(() => {
    return [...filteredResultRows]
      .filter((student) => student.support)
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);
  }, [filteredResultRows]);

  const reportTrendData = useMemo(() => {
    const classAverage = summary.averageScore || average(students.map((student) => student.score)) || 7.2;
    return [
      { name: 'Tuan 1', score: clamp(classAverage - 1, 0, 10) },
      { name: 'Tuan 4', score: clamp(classAverage - 0.55, 0, 10) },
      { name: 'Tuan 8', score: clamp(classAverage - 0.2, 0, 10) },
      { name: 'Cuoi ky', score: clamp(classAverage, 0, 10) },
    ];
  }, [students, summary.averageScore]);

  const reportAverageData = useMemo(() => {
    return classSummaries.slice(0, 6).map((classItem) => ({
      name: classItem.code,
      value: Number(classItem.averageScore.toFixed(2)),
    }));
  }, [classSummaries]);

  const completionData = useMemo(() => {
    return [
      { name: 'Da hoan thanh', value: summary.evaluated, color: '#22c55e' },
      { name: 'Chua hoan thanh', value: Math.max(summary.total - summary.evaluated, 0), color: '#e2e8f0' },
    ];
  }, [summary.evaluated, summary.total]);

  const visibleNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      return notificationFilter === 'Tat ca' || notification.type === notificationFilter;
    });
  }, [notificationFilter, notifications]);

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  const sectionMeta = useMemo(
    () => ({
      overview: {
        title: 'Tong quan lop hoc',
        subtitle: 'Theo doi nhanh toan bo tien do, ket qua va nhom sinh vien can ho tro som.',
        notes: [
          {
            title: 'Thanh phan',
            items: [
              'Cards tong hop ket qua lop.',
              'Bar chart phan bo xep loai.',
              'Bar chart diem trung binh theo ky nang.',
              'Bang sinh vien can ho tro som va hoat dong danh gia gan day.',
            ],
          },
        ],
      },
      classes: {
        title: 'Danh sach lop phu trach',
        subtitle: 'Quan ly tat ca lop hoc, trang thai danh gia va dieu huong nhanh sang cac nghiep vu lien quan.',
        notes: [
          {
            title: 'Action',
            items: [
              'Xem chi tiet se chuyen ve Tong quan.',
              'Danh gia lop se mo dashboard Danh gia sinh vien.',
              'Xem bao cao se mo dashboard Bao cao.',
            ],
          },
        ],
      },
      evaluation: {
        title: 'Danh gia sinh vien',
        subtitle: 'Nhap diem tung tieu chi, cap nhat nhan xet va theo doi tien do cua sinh vien da chon.',
        notes: [
          {
            title: 'Huong dan',
            items: [
              'Chon lop, sinh vien va moc tuan danh gia.',
              'Luu danh gia moi hoac cap nhat du lieu cu ngay trong form.',
              'Tien do va lich su se tu dong cap nhat sau khi luu.',
            ],
          },
        ],
      },
      results: {
        title: 'Ket qua lop',
        subtitle: 'Tong hop ket qua tung sinh vien, tim nhanh doi tuong can can thiep va xuat file de bao cao.',
        notes: [
          {
            title: 'Bo loc',
            items: [
              'Tim theo ho ten sinh vien hoac lop.',
              'Loc theo xep loai de trinh bay nhanh khi bao ve do an.',
              'Nut Export Excel se tai file tong hop ket qua lop hien tai.',
            ],
          },
        ],
      },
      reports: {
        title: 'Bao cao va thong ke',
        subtitle: 'Xem xu huong tien bo, phan tich diem trung binh va ty le hoan thanh danh gia theo tung che do bao cao.',
        notes: [
          {
            title: 'Xuat file',
            items: [
              'Export Excel de dong bo so lieu sang bang bieu.',
              'Export PDF su dung bo cuc in san cho bao ve do an.',
            ],
          },
        ],
      },
      notifications: {
        title: 'Thong bao giao vien',
        subtitle: 'Tong hop thong bao tu Admin, lich danh gia, deadline nhap diem va canh bao sinh vien yeu.',
        notes: [
          {
            title: 'Tac vu',
            items: [
              'Danh dau da doc ngay tren tung thong bao.',
              'Loc nhanh theo nhom thong bao de uu tien xu ly.',
            ],
          },
        ],
      },
      profile: {
        title: 'Ho so ca nhan',
        subtitle: 'Quan ly thong tin giang vien, so lop phu trach, so sinh vien quan ly va cap nhat tai khoan.',
        notes: [
          {
            title: 'Cap nhat',
            items: [
              'Cap nhat thong tin ca nhan ngay trong dashboard.',
              'Doi mat khau bang bieu mau rieng, phu hop demo nghiep vu bao mat.',
            ],
          },
        ],
      },
    }),
    []
  );

  const currentMeta = sectionMeta[activeSection];

  const teacherMenuItems = useMemo(
    () =>
      TEACHER_SECTIONS.map((section) => ({
        label: section.label,
        active: activeSection === section.key,
        onClick: () => {
          startTransition(() => {
            setActiveSection(section.key);
          });
        },
      })),
    [activeSection]
  );

  const handleSaveEvaluation = async (mode) => {
    if (!currentStudent) {
      setEvaluationMessage('Vui long chon sinh vien truoc khi luu danh gia.');
      return;
    }

    setSavingEvaluation(true);
    setEvaluationMessage('');

    try {
      const computed = buildSkillScore(evaluationForm);
      const selectedWeekMeta = WEEK_OPTIONS.find((option) => option.value === selectedWeek);
      const payload = {
        week: selectedWeek,
        weekLabel: selectedWeekMeta?.label || `Tuan ${selectedWeek}`,
        weekOrder: selectedWeekMeta?.order || Number(selectedWeek),
        ...computed,
        comment: evaluationForm.comment,
        updatedAt: new Date().toISOString(),
      };

      await saveStudentEvaluation({
        studentId: currentStudent.id,
        payload,
        evaluatorId: teacherProfile.id,
        evaluatorType: 'teacher',
      });

      const response = await getStudentEvaluations(currentStudent.id);
      const records = normalizeEvaluationHistory(response?.data);
      setStudentHistory(records.sort((a, b) => Number(a.weekNumber) - Number(b.weekNumber)));
      setEvaluationMessage(
        mode === 'update'
          ? `Da cap nhat danh gia cho ${currentStudent.name} (${payload.weekLabel}).`
          : `Da luu danh gia cho ${currentStudent.name} (${payload.weekLabel}).`
      );
    } catch (requestError) {
      setEvaluationMessage(
        requestError?.response?.data?.message || requestError?.message || 'Khong the luu danh gia.'
      );
    } finally {
      setSavingEvaluation(false);
    }
  };

  const handleExportResults = () => {
    downloadSpreadsheet(
      `ket-qua-${selectedClass || 'lop-hoc'}.xls`,
      ['Ho ten', 'Diem tong', 'Xep loai', 'Ky nang yeu nhat', 'Can ho tro som'],
      filteredResultRows.map((student) => [
        student.name,
        student.score.toFixed(2),
        student.level,
        student.weakestSkill.label,
        student.support ? 'Co' : 'Khong',
      ])
    );
  };

  const handleExportReportExcel = () => {
    downloadSpreadsheet(
      `bao-cao-${selectedClass || 'tong-hop'}.xls`,
      ['Lop', 'Sinh vien', 'Da danh gia', 'Diem trung binh', 'Trang thai'],
      classSummaries.map((classItem) => [
        classItem.code,
        classItem.totalStudents,
        classItem.evaluated,
        classItem.averageScore.toFixed(2),
        classItem.status,
      ])
    );
  };

  const handleExportReportPdf = () => {
    printReport(`Bao cao giao vien - ${selectedClass || 'Tong hop'}`, [
      {
        title: 'Thong tin tong hop',
        content: `
          <p>Che do bao cao: ${reportMode}</p>
          <p>Lop dang chon: ${selectedClass || 'Tat ca lop'}</p>
          <p>Hoc ky: ${selectedSemester}</p>
        `,
      },
      {
        title: 'Bang diem tong quan',
        content: `
          <table>
            <thead>
              <tr>
                <th>Ho ten</th>
                <th>Diem tong</th>
                <th>Xep loai</th>
                <th>Ky nang yeu nhat</th>
              </tr>
            </thead>
            <tbody>
              ${filteredResultRows
                .slice(0, 10)
                .map(
                  (student) => `
                    <tr>
                      <td>${student.name}</td>
                      <td>${student.score.toFixed(2)}</td>
                      <td>${student.level}</td>
                      <td>${student.weakestSkill.label}</td>
                    </tr>
                  `
                )
                .join('')}
            </tbody>
          </table>
        `,
      },
    ]);
  };

  const handleMarkAsRead = (notificationId) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification
      )
    );
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileMessage('');
    setProfileSaving(true);

    try {
      const response = await updateTeacherProfile({
        name: profileForm.name,
        email: profileForm.email,
      });
      const data = response?.data || {};

      setTeacherProfile((current) => ({
        ...current,
        name: data.name || profileForm.name,
        email: data.email || profileForm.email,
        department: profileForm.department,
      }));

      if (typeof window !== 'undefined' && teacherProfile.id) {
        window.localStorage.setItem(`ss_teacher_department_${teacherProfile.id}`, profileForm.department);
      }

      setProfileMessage('Da cap nhat thong tin ho so ca nhan.');
    } catch (requestError) {
      setProfileMessage(
        requestError?.response?.data?.message || requestError?.message || 'Khong the cap nhat ho so.'
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordMessage('');
    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage('Mat khau moi can toi thieu 6 ky tu.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('Mat khau xac nhan khong khop.');
      return;
    }

    setPasswordSaving(true);
    try {
      await updateTeacherPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordMessage('Da doi mat khau thanh cong.');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (requestError) {
      setPasswordMessage(
        requestError?.response?.data?.message || requestError?.message || 'Khong the doi mat khau.'
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const jumpToSection = (sectionKey, classCode) => {
    if (classCode) {
      setSelectedClass(classCode);
    }
    startTransition(() => {
      setActiveSection(sectionKey);
    });
  };

  const renderHeaderControls = () => {
    if (['overview', 'evaluation', 'results', 'reports'].includes(activeSection)) {
      return (
        <>
          <select
            value={selectedClass}
            onChange={(event) => setSelectedClass(event.target.value)}
            className={selectClassName}
          >
            {classSummaries.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code}
              </option>
            ))}
          </select>
          <select
            value={selectedSemester}
            onChange={(event) => setSelectedSemester(event.target.value)}
            className={selectClassName}
          >
            {SEMESTER_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </>
      );
    }

    if (activeSection === 'classes') {
      return (
        <select
          value={selectedSemester}
          onChange={(event) => setSelectedSemester(event.target.value)}
          className={selectClassName}
        >
          {SEMESTER_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      );
    }

    if (activeSection === 'notifications') {
      return (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {unreadNotifications} thong bao chua doc
        </div>
      );
    }

    if (activeSection === 'profile') {
      return (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {classSummaries.length} lop dang phu trach
        </div>
      );
    }

    return null;
  };

  const renderOverview = () => (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Tong so sinh vien" value={summary.total} note="Trong lop dang chon" />
        <SummaryCard
          label="Da danh gia"
          value={`${summary.evaluated} (${summary.total ? Math.round((summary.evaluated / summary.total) * 100) : 0}%)`}
          note="Tien do danh gia hien tai"
        />
        <SummaryCard label="Diem trung binh lop" value={summary.averageScore.toFixed(2)} note="Tong hop cac ky nang" />
        <SummaryCard label="Xep loai lop" value={summary.level} note="Danh gia tong quan" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionPanel title="Phan bo xep loai lop">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelDistribution} barCategoryGap={24}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                  {levelDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>

        <SectionPanel title="Diem trung binh theo ky nang mem">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillAverages}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 10]} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                  {skillAverages.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionPanel title="Danh sach sinh vien can ho tro som">
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Ho ten</th>
                  <th className="px-4 py-3">Diem tong</th>
                  <th className="px-4 py-3">Ky nang yeu nhat</th>
                  <th className="px-4 py-3">Ghi chu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {attentionStudents.map((student) => (
                  <tr key={student.id}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{student.name}</td>
                    <td className="px-4 py-3 text-slate-600">{student.score.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-600">{student.weakestSkill.label}</td>
                    <td className="px-4 py-3 text-rose-500">Can theo doi them ve tien do nhom</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionPanel>

        <SectionPanel title="Hoat dong danh gia gan day">
          <div className="grid gap-3">
            {recentEvaluationActivities.map((activity, index) => (
              <div key={`${activity.title}-${index}`} className="flex items-start justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex gap-3">
                  <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{activity.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {activity.level} - {activity.score}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </SectionPanel>
      </section>
    </>
  );

  const renderClasses = () => (
    <section className="grid gap-6 lg:grid-cols-2">
      {classSummaries.map((classItem) => (
        <article key={classItem.code} className={panelClassName}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                {classItem.code}
              </div>
              <h3 className="mt-3 text-xl font-extrabold text-slate-900">{classItem.name}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {classItem.semester} - Nam hoc {classItem.schoolYear}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {classItem.status}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">So sinh vien</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{classItem.totalStudents}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Trang thai danh gia</p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{classItem.completionRate}%</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => jumpToSection('overview', classItem.code)}
              className={secondaryButtonClassName}
            >
              Xem chi tiet
            </button>
            <button
              type="button"
              onClick={() => jumpToSection('evaluation', classItem.code)}
              className={primaryButtonClassName}
            >
              Danh gia lop
            </button>
            <button
              type="button"
              onClick={() => jumpToSection('reports', classItem.code)}
              className={secondaryButtonClassName}
            >
              Xem bao cao
            </button>
          </div>
        </article>
      ))}
    </section>
  );

  const renderEvaluation = () => (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <SectionPanel
        title="Form danh gia sinh vien"
        subtitle="Nhap diem theo tung tieu chi va nhan xet cua giang vien."
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSaveEvaluation(selectedWeekRecord ? 'update' : 'save');
          }}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-sm font-semibold text-slate-700">
              <span className="mb-2 block">Chon lop</span>
              <select
                value={selectedClass}
                onChange={(event) => setSelectedClass(event.target.value)}
                className={inputClassName}
              >
                {classSummaries.map((classItem) => (
                  <option key={classItem.code} value={classItem.code}>
                    {classItem.code}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              <span className="mb-2 block">Chon sinh vien</span>
              <select
                value={selectedStudentId}
                onChange={(event) => setSelectedStudentId(event.target.value)}
                className={inputClassName}
              >
                {filteredStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              <span className="mb-2 block">Chon tuan danh gia</span>
              <select
                value={selectedWeek}
                onChange={(event) => setSelectedWeek(event.target.value)}
                className={inputClassName}
              >
                {WEEK_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['attendance', 'Chuyen can'],
              ['assignment', 'Bai tap'],
              ['presentation', 'Thuyet trinh'],
              ['project', 'Du an'],
              ['peerReview', 'Danh gia dong cap'],
              ['teamContribution', 'Dong gop nhom'],
            ].map(([key, label]) => (
              <label key={key} className="block text-sm font-semibold text-slate-700">
                <span className="mb-2 block">{label}</span>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={evaluationForm[key]}
                  onChange={(event) => setEvaluationForm((current) => ({ ...current, [key]: event.target.value }))}
                  className={inputClassName}
                />
              </label>
            ))}
          </div>

          <label className="block text-sm font-semibold text-slate-700">
            <span className="mb-2 block">Nhan xet giao vien</span>
            <textarea
              rows={4}
              value={evaluationForm.comment}
              onChange={(event) => setEvaluationForm((current) => ({ ...current, comment: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
            Diem du kien: <strong>{evaluationPreview.softSkillScore.toFixed(2)}</strong> - Xep loai{' '}
            <strong>{evaluationPreview.level}</strong>
          </div>

          {evaluationMessage ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {evaluationMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={savingEvaluation} className={primaryButtonClassName}>
              {savingEvaluation ? 'Dang luu...' : 'Luu danh gia'}
            </button>
            <button
              type="button"
              disabled={!selectedWeekRecord || savingEvaluation}
              onClick={() => handleSaveEvaluation('update')}
              className={`${secondaryButtonClassName} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              Cap nhat danh gia
            </button>
          </div>
        </form>
      </SectionPanel>

      <div className="grid gap-6">
        <SectionPanel title="Progress chart tien do sinh vien">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historyChartData} barCategoryGap={24}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 10]} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="score" fill="#10b981" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>

        <SectionPanel title="Lich su danh gia gan nhat">
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Moc danh gia</th>
                  <th className="px-4 py-3">Diem</th>
                  <th className="px-4 py-3">Xep loai</th>
                  <th className="px-4 py-3">Nhan xet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {studentHistory.length > 0 ? (
                  studentHistory
                    .slice()
                    .reverse()
                    .map((item) => (
                      <tr key={`${item.week}-${item.updatedAt || item.weekLabel}`}>
                        <td className="px-4 py-3 font-semibold text-slate-800">{item.weekLabel || `Tuan ${item.week}`}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {parseNumber(item.softSkillScore ?? item.score, 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-emerald-600">
                          {item.level || levelFromScore(parseNumber(item.softSkillScore ?? item.score, 0))}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{item.comment || '-'}</td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      Chua co lich su danh gia. Ban co the bat dau ngay tu form ben trai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionPanel>
      </div>
    </section>
  );

  const renderResults = () => (
    <>
      <SectionPanel
        title="Danh sach ket qua lop"
        action={
          <button type="button" onClick={handleExportResults} className={primaryButtonClassName}>
            Export Excel
          </button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <input
            type="text"
            value={resultSearch}
            onChange={(event) => setResultSearch(event.target.value)}
            placeholder="Search sinh vien..."
            className={inputClassName}
          />
          <select
            value={resultFilter}
            onChange={(event) => setResultFilter(event.target.value)}
            className={inputClassName}
          >
            {RESULT_FILTERS.map((filter) => (
              <option key={filter} value={filter}>
                {filter}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Ho ten</th>
                <th className="px-4 py-3">Diem tong</th>
                <th className="px-4 py-3">Xep loai</th>
                <th className="px-4 py-3">Ky nang yeu nhat</th>
                <th className="px-4 py-3">Can ho tro som</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredResultRows.map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{student.name}</td>
                  <td className="px-4 py-3 text-slate-600">{student.score.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-600">{student.level}</td>
                  <td className="px-4 py-3 text-slate-600">{student.weakestSkill.label}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        student.support ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {student.support ? 'Can can thiep' : 'On dinh'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionPanel title="Top 5 sinh vien tot nhat">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topStudents.map((student) => ({ name: student.name.split(' ').slice(-1)[0], score: student.score }))}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 10]} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="score" radius={[12, 12, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>

        <SectionPanel title="Nhom sinh vien can ho tro som">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supportStudents.map((student) => ({ name: student.name.split(' ').slice(-1)[0], score: student.score }))}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 10]} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="score" radius={[12, 12, 0, 0]} fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>
      </section>
    </>
  );

  const renderReports = () => (
    <>
      <SectionPanel
        title="Trung tam bao cao"
        subtitle="Chon che do bao cao de phuc vu trinh bay va xuat file tong hop."
        action={
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleExportReportExcel} className={secondaryButtonClassName}>
              Export Excel
            </button>
            <button type="button" onClick={handleExportReportPdf} className={primaryButtonClassName}>
              Export PDF
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-3">
          {REPORT_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setReportMode(mode)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                reportMode === mode ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </SectionPanel>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionPanel title="Xu huong tien bo ky nang mem">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportTrendData} barCategoryGap={24}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 10]} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="score" fill="#10b981" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>

        <SectionPanel title="Phan tich diem trung binh">
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportAverageData}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 10]} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionPanel>
      </section>

      <section className="mt-6">
        <SectionPanel title="Ty le hoan thanh danh gia">
          <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={completionData} barCategoryGap={24}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                    {completionData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-3">
              {completionData.map((item) => (
                <div key={item.name} className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-600">{item.name}</p>
                    <span className="text-lg font-extrabold text-slate-900">{item.value}</span>
                  </div>
                </div>
              ))}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                {reportMode} dang hien thi du lieu theo lop <strong>{selectedClass || 'hien tai'}</strong> trong{' '}
                <strong>{selectedSemester}</strong>.
              </div>
            </div>
          </div>
        </SectionPanel>
      </section>
    </>
  );

  const renderNotifications = () => (
    <SectionPanel title="Danh sach thong bao">
      <div className="flex flex-wrap gap-3">
        <select
          value={notificationFilter}
          onChange={(event) => setNotificationFilter(event.target.value)}
          className={inputClassName}
        >
          {NOTIFICATION_FILTERS.map((filter) => (
            <option key={filter} value={filter}>
              {filter}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 grid gap-4">
        {visibleNotifications.map((notification) => (
          <article
            key={notification.id}
            className={`rounded-[24px] border px-5 py-4 shadow-sm ${
              notification.read ? 'border-slate-200 bg-slate-50' : 'border-emerald-200 bg-white'
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    {notification.type}
                  </span>
                  {!notification.read ? (
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-600">Moi</span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-900">{notification.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{notification.message}</p>
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <span className="text-xs font-semibold text-slate-400">{notification.time}</span>
                <button
                  type="button"
                  onClick={() => handleMarkAsRead(notification.id)}
                  disabled={notification.read}
                  className={`${secondaryButtonClassName} px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  Danh dau da doc
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </SectionPanel>
  );

  const renderProfile = () => (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="grid gap-6">
        <SectionPanel title="Thong tin giang vien">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Ho ten', teacherProfile.name],
              ['Email', teacherProfile.email],
              ['Bo mon', teacherProfile.department],
              ['So sinh vien quan ly', `${students.length}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-800">Danh sach lop phu trach</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {classSummaries.map((classItem) => (
                <span key={classItem.code} className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                  {classItem.code}
                </span>
              ))}
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Cap nhat ho so ca nhan">
          <form onSubmit={handleProfileSubmit} className="grid gap-4">
            <label className="block text-sm font-semibold text-slate-700">
              <span className="mb-2 block">Ho ten</span>
              <input
                type="text"
                value={profileForm.name}
                onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                className={inputClassName}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              <span className="mb-2 block">Email</span>
              <input
                type="email"
                value={profileForm.email}
                onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                className={inputClassName}
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              <span className="mb-2 block">Bo mon</span>
              <input
                type="text"
                value={profileForm.department}
                onChange={(event) => setProfileForm((current) => ({ ...current, department: event.target.value }))}
                className={inputClassName}
              />
            </label>
            {profileMessage ? (
              <p
                className={`text-sm font-semibold ${
                  profileMessage.startsWith('Da') ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {profileMessage}
              </p>
            ) : null}
            <button type="submit" disabled={profileSaving} className={primaryButtonClassName}>
              {profileSaving ? 'Dang cap nhat...' : 'Cap nhat ho so'}
            </button>
          </form>
        </SectionPanel>
      </div>

      <SectionPanel title="Doi mat khau">
        <form onSubmit={handlePasswordSubmit} className="grid gap-4">
          <label className="block text-sm font-semibold text-slate-700">
            <span className="mb-2 block">Mat khau hien tai</span>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
              className={inputClassName}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            <span className="mb-2 block">Mat khau moi</span>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
              className={inputClassName}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            <span className="mb-2 block">Xac nhan mat khau moi</span>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              className={inputClassName}
            />
          </label>
          {passwordMessage ? (
            <p
              className={`text-sm font-semibold ${
                passwordMessage.startsWith('Da') ? 'text-emerald-700' : 'text-red-600'
              }`}
            >
              {passwordMessage}
            </p>
          ) : null}
          <button type="submit" disabled={passwordSaving} className={primaryButtonClassName}>
            {passwordSaving ? 'Dang doi...' : 'Doi mat khau'}
          </button>
        </form>
      </SectionPanel>
    </section>
  );

  const renderMainContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'classes':
        return renderClasses();
      case 'evaluation':
        return renderEvaluation();
      case 'results':
        return renderResults();
      case 'reports':
        return renderReports();
      case 'notifications':
        return renderNotifications();
      case 'profile':
        return renderProfile();
      default:
        return renderOverview();
    }
  };

  if (loading) {
    return <Spinner label="Dang tai dashboard giang vien..." />;
  }

  if (error && students.length === 0) {
    return <ErrorState message={error} />;
  }

  return (
    <DashboardFrame
      role="teacher"
      title={currentMeta.title}
      subtitle={currentMeta.subtitle}
      user={{ ...user, name: teacherProfile.name }}
      onLogout={onLogout}
      menuItems={teacherMenuItems}
      headerControls={renderHeaderControls()}
      rightNotes={currentMeta.notes}
    >
      {renderMainContent()}
    </DashboardFrame>
  );
};

export default TeacherDashboard;
