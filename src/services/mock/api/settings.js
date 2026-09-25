// Settings, templates, demo reset and AI suggestion.
import { suggestLesson } from '../engine';
import { db, reset, save } from '../mockDb';
import { wait, ok } from './helpers';

export const saveSettings = (settings) => {
  db().settings = { ...db().settings, ...settings };
  save();
  return ok(db().settings, 'Settings saved');
};

export const saveTemplate = (tpl) => {
  const s = db();
  s.templates = s.templates.map((t) => (t.id === tpl.id ? tpl : tpl.isDefault ? { ...t, isDefault: false } : t));
  save();
  return ok(tpl, 'Template saved');
};

export const resetDemo = () => {
  reset();
  return ok(true, 'Demo data reset');
};

export const aiSuggest = async ({ topicTitle, minutes }) => {
  await wait(900);
  return ok(suggestLesson(topicTitle, minutes));
};
