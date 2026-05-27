import React, { useEffect, useMemo, useState } from 'react';
import LevelPieChart from '../components/LevelPieChart';
import ResultsTable from '../components/ResultsTable';
import SummaryCard from '../components/SummaryCard';
import TopStudentsBarChart from '../components/TopStudentsBarChart';
import TopStudentsTable from '../components/TopStudentsTable';
import { getResults, getStatistics, getTopStudents } from '../services/api';
import './SoftSkillDashboard.css';

const SKILL_CONFIG = [
  { key: 'communication', label: 'Giao tiep', weight: 0.25 },
  { key: 'teamwork', label: 'Lam viec nhom', weight: 0.3 },
  { key: 'criticalThinking', label: 'Tu duy phan bien', weight: 0.25 },
  { key: 'timeManagement', label: 'Quan ly thoi gian', weight: 0.2 },
];

const SKILL_ALIASES = {
  communication: ['communication', 'communicationScore', 'giaoTiep', 'giaoTiepScore'],
  teamwork: ['teamwork', 'teamworkScore', 'lamViecNhom', 'lamViecNhomScore'],
  criticalThinking: ['criticalThinking', 'criticalThinkingScore', 'tuDuyPhanBien', 'tuDuyPhanBienScore'],
  timeManagement: ['timeManagement', 'timeManagementScore', 'quanLyThoiGian', 'quanLyThoiGianScore'],
};

const RECOMMENDATION_MAP = {
  communication: 'Tang tan suat thuyet trinh ngan va phan hoi 2 chieu trong nhom.',
  teamwork: 'Phan ro vai tro, cap nhat task theo tuan va bao cao muc do dong gop.',
  criticalThinking: 'Luyen tap dat cau hoi "vi sao" va ghi ro lap luan khi bao ve y kien.',
  timeManagement: 'Dung ke hoach tuan, chot deadline trung gian va theo doi ti le dung han.',
};

const buildApiErrorMessage = (requestError) => {
  const status = requestError?.response?.status;
  const data = requestError?.response?.data;

  let backendMessage = '';

  if (typeof data === 'string' && data.trim()) {
    backendMessage = data.trim();
  } else if (data && typeof data === 'object') {
    backendMessage = data.message || data.error || data.title || '';
  }

  if (status && backendMessage) {
    return `Loi backend ${status}: ${backendMessage}`;
  }

  if (status) {
    return `Loi backend ${status}: Khong the tai du lieu dashboard.`;
  }

  if (requestError?.message) {
    return `Yeu cau that bai: ${requestError.message}`;
  }

  return 'Khong the tai du lieu dashboard. Vui long thu lai.';
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getNestedValue = (source, path) => {
  return path.reduce((current, segment) => (current ? current[segment] : undefined), source);
};

const getSkillFromPayload = (student, skillKey) => {
  const aliases = SKILL_ALIASES[skillKey];

  for (const alias of aliases) {
    const direct = toNumberOrNull(student?.[alias]);
    if (direct !== null) {
      return direct;
    }

    const nestedCandidates = [
      getNestedValue(student, ['skills', alias]),
      getNestedValue(student, ['skillScores', alias]),
      getNestedValue(student, ['softSkills', alias]),
      getNestedValue(student, ['metrics', alias]),
    ];

    for (const nestedValue of nestedCandidates) {
      const parsedNested = toNumberOrNull(nestedValue);
      if (parsedNested !== null) {
        return parsedNested;
      }
    }
  }

  return null;
};

const normalizeLevel = (level) => {
  const safeLevel = String(level || '').trim().toLowerCase();

  if (safeLevel === 'good' || safeLevel === 'tot' || safeLevel === 'tốt') {
    return 'Good';
  }

  if (safeLevel === 'average' || safeLevel === 'trung binh' || safeLevel === 'trung bình') {
    return 'Average';
  }

  if (safeLevel === 'weak' || safeLevel === 'yeu' || safeLevel === 'yếu') {
    return 'Weak';
  }

  return 'Average';
};

const isStudentRecord = (record) => {
  const role = String(record?.role ?? record?.userRole ?? record?.accountType ?? '').trim().toLowerCase();
  if (role === 'teacher' || role === 'admin') {
    return false;
  }

  if (role === 'student') {
    return true;
  }

  const studentId = String(record?.studentId ?? record?.id ?? '').trim().toUpperCase();
  if (studentId.startsWith('SV')) {
    return true;
  }

  const studentName = String(record?.studentName ?? '').trim();
  if (studentName) {
    return true;
  }

  const name = String(record?.name ?? '').trim();
  if (/^teacher\b/i.test(name)) {
    return false;
  }

  return true;
};

const estimateSkillScores = (student, baseScore) => {
  const normalizedBase = clamp(toNumberOrNull(baseScore) ?? 0, 0, 10);
  const participation = clamp(toNumberOrNull(student.participationRate ?? student.participation) ?? 55, 0, 100);
  const contribution = clamp(toNumberOrNull(student.contributionRate ?? student.contribution) ?? 52, 0, 100);
  const onTimeRate = clamp(toNumberOrNull(student.onTimeRate ?? student.deadlineRate) ?? 58, 0, 100);

  return {
    communication: clamp(normalizedBase * 0.7 + (participation / 100) * 3, 0, 10),
    teamwork: clamp(normalizedBase * 0.65 + (contribution / 100) * 3.5, 0, 10),
    criticalThinking: clamp(normalizedBase * 0.85 + 0.9, 0, 10),
    timeManagement: clamp(normalizedBase * 0.6 + (onTimeRate / 100) * 4, 0, 10),
    estimated: true,
  };
};

const buildSoftSkillIndex = (skillScores) => {
  const rawPoint = SKILL_CONFIG.reduce((total, skill) => total + skillScores[skill.key] * skill.weight, 0);
  return rawPoint * 10;
};

const buildRecommendation = (skillScores) => {
  const sortedSkills = [...SKILL_CONFIG].sort((a, b) => skillScores[a.key] - skillScores[b.key]);
  const lowestSkill = sortedSkills[0]?.key;
  return RECOMMENDATION_MAP[lowestSkill] || 'Tiep tuc duy tri tien do hoc tap va theo doi ket qua hang tuan.';
};

const normalizeStudent = (student) => {
  const rawScore = Number(student.score ?? student.result ?? student.totalScore ?? 0);
  const candidateScores = SKILL_CONFIG.reduce((acc, skill) => {
    acc[skill.key] = getSkillFromPayload(student, skill.key);
    return acc;
  }, {});
  const hasSkillPayload = SKILL_CONFIG.some((skill) => candidateScores[skill.key] !== null);

  const computedScores = hasSkillPayload
    ? {
        communication: clamp(candidateScores.communication ?? rawScore, 0, 10),
        teamwork: clamp(candidateScores.teamwork ?? rawScore, 0, 10),
        criticalThinking: clamp(candidateScores.criticalThinking ?? rawScore, 0, 10),
        timeManagement: clamp(candidateScores.timeManagement ?? rawScore, 0, 10),
        estimated: false,
      }
    : estimateSkillScores(student, rawScore);

  return {
    id: student.id || student.studentId || `${student.name || student.studentName || 'student'}-${rawScore}`,
    name: student.name || student.studentName || 'Khong ro',
    score: rawScore,
    level: normalizeLevel(student.level ?? student.rank),
    skillScores: computedScores,
    softSkillIndex: buildSoftSkillIndex(computedScores),
    recommendation: buildRecommendation(computedScores),
    className: student.className || student.class || student.classroom || 'Unassigned',
    teacherName: student.teacherName || student.teacher || student.homeroomTeacher || 'Unassigned',
  };
};

const unwrapPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.$values)) {
    return payload.$values;
  }

  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  if (payload && Array.isArray(payload.results)) {
    return payload.results;
  }

  if (payload && Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
};

const unwrapStats = (payload) => {
  if (!payload || Array.isArray(payload)) {
    return {};
  }

  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return payload.data;
  }

  return payload;
};

const SoftSkillDashboard = () => {
  const [results, setResults] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [statistics, setStatistics] = useState({
    averageScore: 0,
    totalStudents: 0,
    good: 0,
    average: 0,
    weak: 0,
  });
  const [filterLevel, setFilterLevel] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');

      try {
        const [resultsResponse, topResponse, statisticsResponse] = await Promise.all([
          getResults(),
          getTopStudents(5),
          getStatistics(),
        ]);

        const normalizedResults = unwrapPayload(resultsResponse.data)
          .filter(isStudentRecord)
          .map(normalizeStudent);
        const normalizedTopStudents = unwrapPayload(topResponse.data)
          .filter(isStudentRecord)
          .map(normalizeStudent);

        const incomingStats = unwrapStats(statisticsResponse.data);

        const goodCount =
          Number(incomingStats.good ?? incomingStats.goodCount ?? incomingStats.totalGood ?? 0) ||
          normalizedResults.filter((student) => student.level === 'Good').length;

        const averageCount =
          Number(
            incomingStats.average ?? incomingStats.averageCount ?? incomingStats.totalAverage ?? 0
          ) || normalizedResults.filter((student) => student.level === 'Average').length;

        const weakCount =
          Number(incomingStats.weak ?? incomingStats.weakCount ?? incomingStats.totalWeak ?? 0) ||
          normalizedResults.filter((student) => student.level === 'Weak').length;

        const totalStudents =
          Number(incomingStats.totalStudents ?? incomingStats.total ?? normalizedResults.length) ||
          normalizedResults.length;

        const avgScoreFromResults =
          normalizedResults.length > 0
            ? normalizedResults.reduce((total, student) => total + student.score, 0) / normalizedResults.length
            : 0;

        const averageScore = Number(incomingStats.averageScore ?? incomingStats.avgScore ?? avgScoreFromResults);

        setResults(normalizedResults);
        setTopStudents(normalizedTopStudents);
        setStatistics({
          averageScore,
          totalStudents,
          good: goodCount,
          average: averageCount,
          weak: weakCount,
        });
      } catch (requestError) {
        setError(buildApiErrorMessage(requestError));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const filteredResults = useMemo(() => {
    if (filterLevel === 'All') {
      return results;
    }

    return results.filter((student) => student.level === filterLevel);
  }, [results, filterLevel]);

  const pieData = useMemo(
    () => [
      { name: 'Tot', value: statistics.good },
      { name: 'Trung binh', value: statistics.average },
      { name: 'Yeu', value: statistics.weak },
    ],
    [statistics]
  );

  const barData = useMemo(
    () => topStudents.map((student) => ({ name: student.name, score: student.score })),
    [topStudents]
  );

  const skillOverview = useMemo(() => {
    if (results.length === 0) {
      return SKILL_CONFIG.map((skill) => ({ ...skill, avgPoint: 0, percent: 0 }));
    }

    return SKILL_CONFIG.map((skill) => {
      const total = results.reduce((sum, student) => sum + student.skillScores[skill.key], 0);
      const avgPoint = total / results.length;
      return {
        ...skill,
        avgPoint,
        percent: clamp((avgPoint / 10) * 100, 0, 100),
      };
    });
  }, [results]);

  const dataQuality = useMemo(() => {
    if (results.length === 0) {
      return { estimatedCount: 0, providedCount: 0 };
    }

    const estimatedCount = results.filter((student) => student.skillScores.estimated).length;
    return {
      estimatedCount,
      providedCount: results.length - estimatedCount,
    };
  }, [results]);

  const atRiskStudents = useMemo(() => {
    return [...results]
      .sort((a, b) => a.softSkillIndex - b.softSkillIndex)
      .slice(0, 5)
      .map((student) => {
        const weakestSkill = [...SKILL_CONFIG].sort(
          (left, right) => student.skillScores[left.key] - student.skillScores[right.key]
        )[0];

        return {
          ...student,
          weakestSkill: weakestSkill?.label || 'Chua xac dinh',
        };
      });
  }, [results]);

  const classReport = useMemo(() => {
    const buckets = new Map();
    results.forEach((student) => {
      const key = student.className || 'Unassigned';
      const entry = buckets.get(key) || { className: key, count: 0, totalScore: 0 };
      entry.count += 1;
      entry.totalScore += student.score;
      buckets.set(key, entry);
    });

    return [...buckets.values()]
      .map((item) => ({
        ...item,
        avgScore: item.count > 0 ? item.totalScore / item.count : 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [results]);

  const teacherReport = useMemo(() => {
    const buckets = new Map();
    results.forEach((student) => {
      const key = student.teacherName || 'Unassigned';
      const entry = buckets.get(key) || { teacherName: key, count: 0, totalScore: 0 };
      entry.count += 1;
      entry.totalScore += student.score;
      buckets.set(key, entry);
    });

    return [...buckets.values()]
      .map((item) => ({
        ...item,
        avgScore: item.count > 0 ? item.totalScore / item.count : 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [results]);

  if (loading) {
    return (
      <div className="dashboard-shell loading-shell">
        <p>Dang tai du lieu dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-shell loading-shell">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <h1>Phan tich ky nang mem</h1>
        <p>Tong quan ket qua danh gia ky nang mem cua sinh vien</p>
      </header>

      <section className="summary-grid">
        <SummaryCard title="Diem trung binh" value={statistics.averageScore.toFixed(2)} accent="blue" />
        <SummaryCard title="Tong so hoc sinh" value={statistics.totalStudents} accent="teal" />
        <SummaryCard title="Tot" value={statistics.good} accent="green" />
        <SummaryCard title="Trung binh" value={statistics.average} accent="amber" />
        <SummaryCard title="Yeu" value={statistics.weak} accent="red" />
      </section>

      <section className="content-grid">
        <TopStudentsTable students={topStudents} />
        <ResultsTable students={filteredResults} filter={filterLevel} onFilterChange={setFilterLevel} />
      </section>

      <section className="insight-grid">
        <article className="panel">
          <div className="panel__header-row">
            <h2 className="panel__title">Mo hinh danh gia ky nang mem</h2>
          </div>
          <p className="model-description">
            Chi so tong hop duoc tinh theo trong so: Giao tiep 25%, Lam viec nhom 30%, Tu duy phan bien 25%, Quan ly
            thoi gian 20%.
          </p>
          <p className="model-description">
            Du lieu chi tiet tu backend: {dataQuality.providedCount} sinh vien. Du lieu uoc tinh tu diem tong + muc do
            tham gia: {dataQuality.estimatedCount} sinh vien.
          </p>
          <div className="skill-stack">
            {skillOverview.map((skill) => (
              <div className="skill-row" key={skill.key}>
                <div className="skill-row__label">
                  <span>{skill.label}</span>
                  <strong>{skill.avgPoint.toFixed(2)}/10</strong>
                </div>
                <div className="skill-row__track">
                  <span className="skill-row__fill" style={{ width: `${skill.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel__header-row">
            <h2 className="panel__title">Nhom can ho tro som</h2>
          </div>
          <div className="table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Ho ten</th>
                  <th>Chi so</th>
                  <th>Can uu tien</th>
                  <th>Goi y can thiep</th>
                </tr>
              </thead>
              <tbody>
                {atRiskStudents.length > 0 ? (
                  atRiskStudents.map((student) => (
                    <tr key={`risk-${student.id}`}>
                      <td>{student.name}</td>
                      <td>{student.softSkillIndex.toFixed(1)}</td>
                      <td>{student.weakestSkill}</td>
                      <td>{student.recommendation}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="empty-state-cell">
                      Chua co du lieu canh bao.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="chart-grid">
        <LevelPieChart data={pieData} />
        <TopStudentsBarChart data={barData} />
      </section>

      <section className="insight-grid" style={{ marginTop: '18px' }}>
        <article className="panel">
          <div className="panel__header-row">
            <h2 className="panel__title">Bao cao theo lop</h2>
          </div>
          <div className="table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Lop</th>
                  <th>So SV</th>
                  <th>Diem TB</th>
                </tr>
              </thead>
              <tbody>
                {classReport.length > 0 ? (
                  classReport.map((item) => (
                    <tr key={`class-${item.className}`}>
                      <td>{item.className}</td>
                      <td>{item.count}</td>
                      <td>{item.avgScore.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="empty-state-cell">
                      Chua co du lieu lop.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel__header-row">
            <h2 className="panel__title">Bao cao theo giao vien</h2>
          </div>
          <div className="table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Giao vien</th>
                  <th>So SV</th>
                  <th>Diem TB</th>
                </tr>
              </thead>
              <tbody>
                {teacherReport.length > 0 ? (
                  teacherReport.map((item) => (
                    <tr key={`teacher-${item.teacherName}`}>
                      <td>{item.teacherName}</td>
                      <td>{item.count}</td>
                      <td>{item.avgScore.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="empty-state-cell">
                      Chua co du lieu giao vien.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
};

export default SoftSkillDashboard;
