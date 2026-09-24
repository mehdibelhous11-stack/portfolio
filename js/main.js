import { renderExperience, renderProjects, renderSkills } from './modules/render.js';
import { initCursor } from './modules/cursor.js';
import { initBackground } from './modules/background.js';
import { initReveal } from './modules/reveal.js';
import { initNavigation } from './modules/navigation.js';

renderExperience();
renderProjects();
renderSkills();

initCursor();
initBackground();
initReveal();
initNavigation();
