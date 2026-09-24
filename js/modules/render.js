import { experience } from '../../data/experience.js';
import { projects } from '../../data/projects.js';
import { skillGroups } from '../../data/skills.js';

export function renderExperience() {
  const container = document.getElementById('timeline');
  if (!container) return;

  container.innerHTML = experience.map(item => `
    <div class="timeline-item">
      <div class="timeline-date">${item.date}</div>
      <div class="timeline-role">${item.role}</div>
      <div class="timeline-company">${item.company}</div>
      <div class="timeline-tags">
        ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

export function renderProjects() {
  const container = document.getElementById('projects-grid');
  if (!container) return;

  container.innerHTML = projects.map(project => `
    <div class="project-card reveal" data-hoverable>
      <div class="project-icon">${project.icon}</div>
      <div class="project-category">${project.category}</div>
      <div class="project-name">${project.name}</div>
      <div class="project-desc">${project.desc}</div>
      <div class="project-stack">
        ${project.stack.map(tech => `<span class="stack-tag">${tech}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

export function renderSkills() {
  const container = document.getElementById('skills-container');
  if (!container) return;

  container.innerHTML = skillGroups.map(group => `
    <div class="skill-group" data-hoverable>
      <div class="skill-group-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">${group.icon}</svg>
        ${group.title}
      </div>
      <ul class="skill-list">
        ${group.items.map(item => `<li><span class="skill-dot"></span>${item}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}
