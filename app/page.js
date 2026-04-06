'use client';

import { useState, useEffect } from 'react';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' }
];

const PAIR_NUMBERS = [
  { value: 1, label: '1 пара (08:30-10:00)' },
  { value: 2, label: '2 пара (10:10-11:40)' },
  { value: 3, label: '3 пара (12:10-13:40)' },
  { value: 4, label: '4 пара (13:50-15:20)' },
  { value: 5, label: '5 пара (15:30-17:00)' },
  { value: 6, label: '6 пара (17:10-18:40)' }
];

export default function Home() {
  const [schedule, setSchedule] = useState([]);
  const [filteredSchedule, setFilteredSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  
  // Фильтры
  const [filters, setFilters] = useState({
    groupId: '',
    teacherId: '',
    dayOfWeek: ''
  });
  
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [notification, setNotification] = useState(null);
  
  // Данные для справочников
  const [groups, setGroups] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  // Состояния для форм
  const [newLesson, setNewLesson] = useState({
    group_id: '',
    teacher_id: '',
    subject_id: '',
    pair_number: '',
    day_of_week: ''
  });
  
  const [newGroup, setNewGroup] = useState({ name: '' });
  const [newTeacher, setNewTeacher] = useState({ name: '' });
  const [newSubject, setNewSubject] = useState({ name: '' });
  
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Применение фильтров к расписанию
  const applyFilters = (data, currentFilters) => {
    let filtered = [...data];
    
    if (currentFilters.groupId) {
      filtered = filtered.filter(item => item.group_id === parseInt(currentFilters.groupId));
    }
    
    if (currentFilters.teacherId) {
      filtered = filtered.filter(item => item.teacher_id === parseInt(currentFilters.teacherId));
    }
    
    if (currentFilters.dayOfWeek) {
      filtered = filtered.filter(item => item.day_of_week === parseInt(currentFilters.dayOfWeek));
    }
    
    // Подсчет активных фильтров
    let count = 0;
    if (currentFilters.groupId) count++;
    if (currentFilters.teacherId) count++;
    if (currentFilters.dayOfWeek) count++;
    setActiveFiltersCount(count);
    
    return filtered;
  };

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/schedule');
      const data = await response.json();
      const scheduleData = Array.isArray(data) ? data : [];
      setSchedule(scheduleData);
      
      // Применяем текущие фильтры к загруженным данным
      const filtered = applyFilters(scheduleData, filters);
      setFilteredSchedule(filtered);
    } catch (error) {
      console.error('Ошибка:', error);
      showNotification('Ошибка загрузки расписания', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDirectories = async () => {
    try {
      const [groupsRes, teachersRes, subjectsRes] = await Promise.all([
        fetch('/api/groups'),
        fetch('/api/teachers'),
        fetch('/api/subjects')
      ]);
      
      const groupsData = await groupsRes.json();
      const teachersData = await teachersRes.json();
      const subjectsData = await subjectsRes.json();
      
      setGroups(Array.isArray(groupsData) ? groupsData : []);
      setTeachers(Array.isArray(teachersData) ? teachersData : []);
      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
    } catch (error) {
      console.error('Ошибка загрузки справочников:', error);
    }
  };

  // Обработчик изменения фильтров
  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    
    // Применяем фильтры к текущему расписанию
    const filtered = applyFilters(schedule, newFilters);
    setFilteredSchedule(filtered);
  };

  // Сброс всех фильтров
  const resetFilters = () => {
    const resetFiltersState = {
      groupId: '',
      teacherId: '',
      dayOfWeek: ''
    };
    setFilters(resetFiltersState);
    const filtered = applyFilters(schedule, resetFiltersState);
    setFilteredSchedule(filtered);
    showNotification('🧹 Все фильтры сброшены', 'info');
  };

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setShowLoginModal(false);
        setLoginData({ username: '', password: '' });
        showNotification('✅ Успешный вход!', 'success');
      } else {
        showNotification('❌ Неверный логин или пароль', 'error');
      }
    } catch (error) {
      showNotification('❌ Ошибка при входе', 'error');
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    showNotification('👋 Вы вышли из системы', 'info');
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    
    if (!token) {
      showNotification('Только администратор может добавлять занятия!', 'error');
      return;
    }

    if (!newLesson.group_id || !newLesson.teacher_id || !newLesson.subject_id || 
        !newLesson.pair_number || !newLesson.day_of_week) {
      showNotification('Заполните все поля!', 'error');
      return;
    }

    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newLesson)
      });

      if (response.ok) {
        showNotification('Занятие добавлено!', 'success');
        setNewLesson({
          group_id: '',
          teacher_id: '',
          subject_id: '',
          pair_number: '',
          day_of_week: ''
        });
        await loadSchedule(); // Перезагружаем расписание с сохранением фильтров
      } else {
        const error = await response.json();
        showNotification(error.error || 'Ошибка при добавлении', 'error');
      }
    } catch (error) {
      showNotification('Ошибка при добавлении', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!token) {
      showNotification('Только администратор может удалять!', 'error');
      return;
    }

    if (confirm('Удалить занятие?')) {
      try {
        const response = await fetch(`/api/schedule/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          showNotification('Занятие удалено!', 'success');
          await loadSchedule(); // Перезагружаем расписание с сохранением фильтров
        } else {
          showNotification('Ошибка при удалении', 'error');
        }
      } catch (error) {
        showNotification('Ошибка при удалении', 'error');
      }
    }
  };

  const handleEdit = (lesson) => {
    setEditingLesson({ ...lesson });
    setShowEditModal(true);
  };

  const handleUpdateLesson = async () => {
    if (!token) {
      showNotification('Только администратор может редактировать!', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/schedule/${editingLesson.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          group_id: editingLesson.group_id,
          teacher_id: editingLesson.teacher_id,
          subject_id: editingLesson.subject_id,
          pair_number: editingLesson.pair_number,
          day_of_week: editingLesson.day_of_week
        })
      });

      if (response.ok) {
        showNotification('Занятие обновлено!', 'success');
        setShowEditModal(false);
        setEditingLesson(null);
        await loadSchedule(); // Перезагружаем расписание с сохранением фильтров
      } else {
        const error = await response.json();
        showNotification(error.error || '❌ Ошибка при обновлении', 'error');
      }
    } catch (error) {
      showNotification('❌ Ошибка при обновлении', 'error');
    }
  };

  const addDirectoryItem = async (type, name, setItems, setModal, setFormData) => {
    if (!name.trim()) {
      showNotification('Введите название!', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: name.trim() })
      });

      if (response.ok) {
        showNotification(`✅ ${type === 'groups' ? 'Группа' : type === 'teachers' ? 'Преподаватель' : 'Предмет'} добавлен(а)!`, 'success');
        await loadDirectories();
        setModal(false);
        setFormData({ name: '' });
      } else {
        const error = await response.json();
        showNotification(error.error || 'Ошибка при добавлении', 'error');
      }
    } catch (error) {
      showNotification('Ошибка при добавлении', 'error');
    }
  };

  const deleteDirectoryItem = async (type, id, name) => {
    if (!confirm(`Удалить ${name}? Все связанные занятия также будут удалены.`)) return;

    try {
      const response = await fetch(`/api/${type}?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showNotification(`✅ ${name} удален(а)!`, 'success');
        await loadDirectories();
        // Если удалили группу, которая была выбрана в фильтре - сбрасываем фильтр
        if (type === 'groups' && filters.groupId == id) {
          handleFilterChange('groupId', '');
        }
        // Если удалили преподавателя, который был выбран в фильтре - сбрасываем фильтр
        if (type === 'teachers' && filters.teacherId == id) {
          handleFilterChange('teacherId', '');
        }
        await loadSchedule();
      } else {
        showNotification('Ошибка при удалении', 'error');
      }
    } catch (error) {
      showNotification('Ошибка при удалении', 'error');
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) setToken(savedToken);
    loadSchedule();
    loadDirectories();
  }, []);

  const getDayLabel = (day) => DAYS_OF_WEEK.find(d => d.value === day)?.label || '';
  const getPairLabel = (pair) => PAIR_NUMBERS.find(p => p.value === pair)?.label || '';

  // Получение названия группы по ID
  const getGroupName = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : '';
  };

  // Получение имени преподавателя по ID
  const getTeacherName = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : '';
  };

  return (
    <div className="container">
      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="header">
        <h1>Расписание колледжа</h1>
        <p>Система управления расписанием занятий</p>
        <div className="auth-status">
          {token ? (
            <>
              <span className="admin-badge">Администратор</span>
              <button className="logout-btn" onClick={handleLogout}>Выйти</button>
            </>
          ) : (
            <button className="login-btn" onClick={() => setShowLoginModal(true)}>
              Вход для администратора
            </button>
          )}
        </div>
      </div>

      {/* Секция фильтрации */}
      <div className="search-section">
        <div className="filters-header">
          <h3>Фильтрация расписания</h3>
          {activeFiltersCount > 0 && (
            <button className="reset-filters-btn" onClick={resetFilters}>
              🧹 Сбросить все фильтры ({activeFiltersCount})
            </button>
          )}
        </div>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label>По группе</label>
            <select 
              value={filters.groupId} 
              onChange={(e) => handleFilterChange('groupId', e.target.value)}
            >
              <option value="">Все группы</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>По преподавателю</label>
            <select 
              value={filters.teacherId} 
              onChange={(e) => handleFilterChange('teacherId', e.target.value)}
            >
              <option value="">Все преподаватели</option>
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>По дню недели</label>
            <select 
              value={filters.dayOfWeek} 
              onChange={(e) => handleFilterChange('dayOfWeek', e.target.value)}
            >
              <option value="">Все дни</option>
              {DAYS_OF_WEEK.map(day => (
                <option key={day.value} value={day.value}>{day.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Активные фильтры (визуальные индикаторы) */}
        {activeFiltersCount > 0 && (
          <div className="active-filters">
            <span className="active-filters-label">Активные фильтры:</span>
            <div className="filter-tags">
              {filters.groupId && (
                <span className="filter-tag">
                  Группа: {getGroupName(parseInt(filters.groupId))}
                  <button onClick={() => handleFilterChange('groupId', '')} className="remove-filter">×</button>
                </span>
              )}
              {filters.teacherId && (
                <span className="filter-tag">
                  Преподаватель: {getTeacherName(parseInt(filters.teacherId))}
                  <button onClick={() => handleFilterChange('teacherId', '')} className="remove-filter">×</button>
                </span>
              )}
              {filters.dayOfWeek && (
                <span className="filter-tag">
                  День: {DAYS_OF_WEEK.find(d => d.value === parseInt(filters.dayOfWeek))?.label}
                  <button onClick={() => handleFilterChange('dayOfWeek', '')} className="remove-filter">×</button>
                </span>
              )}
            </div>
          </div>
        )}

        {token && (
          <div className="add-group-btn-container">
            <button className="add-dir-btn" onClick={() => setShowGroupModal(true)}>
              + Добавить группу
            </button>
          </div>
        )}
      </div>

      {/* Результаты фильтрации */}
      <div className="schedule-section">
        <div className="results-info">
          {!loading && (
            <span className="results-count">
              Найдено занятий: {filteredSchedule.length}
              {activeFiltersCount > 0 && ` (отфильтровано из ${schedule.length})`}
            </span>
          )}
        </div>
        
        {loading ? (
          <div className="loading">⏳ Загрузка расписания...</div>
        ) : filteredSchedule.length === 0 ? (
          <div className="empty-message">
            Занятия не найдены
            {activeFiltersCount > 0 && <span className="empty-hint">Попробуйте изменить параметры фильтрации</span>}
          </div>
        ) : (
          <table className="schedule-table">
            <thead>
              <tr>
                <th>День</th>
                <th>Пара</th>
                <th>Группа</th>
                <th>Предмет</th>
                <th>Преподаватель</th>
                {token && <th>Действия</th>}
              </tr>
            </thead>
            <tbody>
              {filteredSchedule.map((item) => (
                <tr key={item.id}>
                  <td>{getDayLabel(item.day_of_week)}</td>
                  <td>{getPairLabel(item.pair_number)}</td>
                  <td><strong>{item.group_name}</strong></td>
                  <td>{item.subject_name}</td>
                  <td>{item.teacher_name}</td>
                  {token && (
                    <td className="action-buttons">
                      <button className="edit-btn" onClick={() => handleEdit(item)}>
                        Редактировать
                      </button>
                      <button className="delete-btn" onClick={() => handleDelete(item.id)}>
                        🗑️ Удалить
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
           </table>
        )}
      </div>

      {/* Остальные компоненты (формы добавления, модальные окна) остаются без изменений */}
      {token && (
        <>
          <div className="add-section">
            <h2>Добавить новое занятие</h2>
            <form onSubmit={handleAddLesson}>
              <div className="form-row">
                <div className="form-group">
                  <label>Группа *</label>
                  <select
                    value={newLesson.group_id}
                    onChange={(e) => setNewLesson({ ...newLesson, group_id: e.target.value })}
                    required
                  >
                    <option value="">Выберите группу</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Предмет *</label>
                  <select
                    value={newLesson.subject_id}
                    onChange={(e) => setNewLesson({ ...newLesson, subject_id: e.target.value })}
                    required
                  >
                    <option value="">Выберите предмет</option>
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Преподаватель *</label>
                  <select
                    value={newLesson.teacher_id}
                    onChange={(e) => setNewLesson({ ...newLesson, teacher_id: e.target.value })}
                    required
                  >
                    <option value="">Выберите преподавателя</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>День недели *</label>
                  <select
                    value={newLesson.day_of_week}
                    onChange={(e) => setNewLesson({ ...newLesson, day_of_week: parseInt(e.target.value) })}
                    required
                  >
                    <option value="">Выберите день</option>
                    {DAYS_OF_WEEK.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Номер пары *</label>
                  <select
                    value={newLesson.pair_number}
                    onChange={(e) => setNewLesson({ ...newLesson, pair_number: parseInt(e.target.value) })}
                    required
                  >
                    <option value="">Выберите пару</option>
                    {PAIR_NUMBERS.map(pair => (
                      <option key={pair.value} value={pair.value}>{pair.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="add-btn">
                Добавить занятие
              </button>
            </form>
          </div>

          <div className="directories-section">
            <div className="dir-card">
              <h3>Группы</h3>
              <button className="add-dir-btn-small" onClick={() => setShowGroupModal(true)}>
                + Добавить группу
              </button>
              <div className="dir-list">
                {groups.map(group => (
                  <div key={group.id} className="dir-item">
                    <span>{group.name}</span>
                    <button 
                      className="delete-small-btn"
                      onClick={() => deleteDirectoryItem('groups', group.id, group.name)}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="dir-card">
              <h3>Преподаватели</h3>
              <button className="add-dir-btn-small" onClick={() => setShowTeacherModal(true)}>
                + Добавить преподавателя
              </button>
              <div className="dir-list">
                {teachers.map(teacher => (
                  <div key={teacher.id} className="dir-item">
                    <span>{teacher.name}</span>
                    <button 
                      className="delete-small-btn"
                      onClick={() => deleteDirectoryItem('teachers', teacher.id, teacher.name)}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="dir-card">
              <h3>Предметы</h3>
              <button className="add-dir-btn-small" onClick={() => setShowSubjectModal(true)}>
                + Добавить предмет
              </button>
              <div className="dir-list">
                {subjects.map(subject => (
                  <div key={subject.id} className="dir-item">
                    <span>{subject.name}</span>
                    <button 
                      className="delete-small-btn"
                      onClick={() => deleteDirectoryItem('subjects', subject.id, subject.name)}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Модальные окна (остаются без изменений) */}
      {showGroupModal && (
        <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>➕ Добавить группу</h2>
            <input
              type="text"
              placeholder="Название группы"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ name: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && addDirectoryItem('groups', newGroup.name, setGroups, setShowGroupModal, setNewGroup)}
            />
            <button onClick={() => addDirectoryItem('groups', newGroup.name, setGroups, setShowGroupModal, setNewGroup)}>
              Добавить
            </button>
            <button onClick={() => setShowGroupModal(false)}>Отмена</button>
          </div>
        </div>
      )}

      {showTeacherModal && (
        <div className="modal-overlay" onClick={() => setShowTeacherModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>➕ Добавить преподавателя</h2>
            <input
              type="text"
              placeholder="ФИО преподавателя"
              value={newTeacher.name}
              onChange={(e) => setNewTeacher({ name: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && addDirectoryItem('teachers', newTeacher.name, setTeachers, setShowTeacherModal, setNewTeacher)}
            />
            <button onClick={() => addDirectoryItem('teachers', newTeacher.name, setTeachers, setShowTeacherModal, setNewTeacher)}>
              Добавить
            </button>
            <button onClick={() => setShowTeacherModal(false)}>Отмена</button>
          </div>
        </div>
      )}

      {showSubjectModal && (
        <div className="modal-overlay" onClick={() => setShowSubjectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>➕ Добавить предмет</h2>
            <input
              type="text"
              placeholder="Название предмета"
              value={newSubject.name}
              onChange={(e) => setNewSubject({ name: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && addDirectoryItem('subjects', newSubject.name, setSubjects, setShowSubjectModal, setNewSubject)}
            />
            <button onClick={() => addDirectoryItem('subjects', newSubject.name, setSubjects, setShowSubjectModal, setNewSubject)}>
              Добавить
            </button>
            <button onClick={() => setShowSubjectModal(false)}>Отмена</button>
          </div>
        </div>
      )}

      {showEditModal && editingLesson && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Редактирование занятия</h2>
            <select
              value={editingLesson.group_id}
              onChange={(e) => setEditingLesson({ ...editingLesson, group_id: parseInt(e.target.value) })}
            >
              {groups.map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
            <select
              value={editingLesson.subject_id}
              onChange={(e) => setEditingLesson({ ...editingLesson, subject_id: parseInt(e.target.value) })}
            >
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
            <select
              value={editingLesson.teacher_id}
              onChange={(e) => setEditingLesson({ ...editingLesson, teacher_id: parseInt(e.target.value) })}
            >
              {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
              ))}
            </select>
            <select
              value={editingLesson.day_of_week}
              onChange={(e) => setEditingLesson({ ...editingLesson, day_of_week: parseInt(e.target.value) })}
            >
              {DAYS_OF_WEEK.map(day => (
                <option key={day.value} value={day.value}>{day.label}</option>
              ))}
            </select>
            <select
              value={editingLesson.pair_number}
              onChange={(e) => setEditingLesson({ ...editingLesson, pair_number: parseInt(e.target.value) })}
            >
              {PAIR_NUMBERS.map(pair => (
                <option key={pair.value} value={pair.value}>{pair.label}</option>
              ))}
            </select>
            <button onClick={handleUpdateLesson}>Сохранить изменения</button>
            <button onClick={() => setShowEditModal(false)}>❌ Отмена</button>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Вход для администратора</h2>
            <input
              type="text"
              placeholder="Логин"
              value={loginData.username}
              onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
            />
            <input
              type="password"
              placeholder="Пароль"
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
            />
            <button onClick={handleLogin}>Войти</button>
            <button onClick={() => setShowLoginModal(false)}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
}