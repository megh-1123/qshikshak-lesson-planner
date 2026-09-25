import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreatePlanPage from '@/pages/lesson-planner/CreatePlanPage';
import { lessonPlannerApi } from '@/services/lessonPlannerApi';
import { templates, defaultSettings } from '@/services/mock/seed';

const toast = vi.fn();
vi.mock('@/context/ToastContext', () => ({ useToast: () => toast }));
vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    user: { id: 't1' },
    masters: { templates, settings: defaultSettings },
    myAssignments: () => [
      { sectionId: 's8a', subjectId: 'sci', classId: 'c8', periodsPerWeek: 6 },
      { sectionId: 's8b', subjectId: 'sci', classId: 'c8', periodsPerWeek: 5 },
    ],
    sectionLabel: (id) => ({ s8a: 'Class 8-A', s8b: 'Class 8-B' })[id],
    subjectName: () => 'Science',
  }),
}));

const renderPage = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CreatePlanPage />
    </MemoryRouter>,
  );
const generateBtn = () => screen.getByRole('button', { name: /generate plan/i });
const chooseClass = () => fireEvent.click(screen.getByRole('button', { name: /Class 8-A/ }));

beforeEach(() => {
  toast.mockClear();
});

describe('TC-04 Required fields on the Create Plan screen', () => {
  it('keeps "Generate plan" disabled until a class & subject is chosen', () => {
    renderPage();
    expect(generateBtn()).toBeDisabled();
    chooseClass();
    expect(generateBtn()).toBeEnabled();
  });

  it('keeps "Generate plan" disabled when the To date is before the From date', () => {
    renderPage();
    chooseClass();
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-10' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-01' } });
    expect(generateBtn()).toBeDisabled();
  });

  it('does not call the API when nothing is selected', () => {
    const spy = vi.spyOn(lessonPlannerApi, 'generatePlan');
    renderPage();
    fireEvent.click(generateBtn());
    expect(spy).not.toHaveBeenCalled();
  });

  it('shows the server message as an error toast when creation fails', async () => {
    vi.spyOn(lessonPlannerApi, 'generatePlan').mockRejectedValue(new Error('Nothing to plan'));
    renderPage();
    chooseClass();
    fireEvent.click(generateBtn());
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Nothing to plan', 'error'));
  });

  // A cleared date is '' and '' > '2026-…' is false, so the button stays enabled.
  it.fails('KNOWN GAP: disables "Generate plan" when a date is cleared', () => {
    renderPage();
    chooseClass();
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '' } });
    expect(generateBtn()).toBeDisabled();
  });
});

describe('TC-03 Create a plan from the screen', () => {
  it('sends the chosen class, section, subject, dates and template', async () => {
    const spy = vi.spyOn(lessonPlannerApi, 'generatePlan').mockResolvedValue({
      data: { plan: { id: 'plan-x' }, placedCount: 6, skippedDays: [], unscheduled: [] },
    });
    renderPage();
    chooseClass();
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-28' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-03' } });
    fireEvent.click(generateBtn());

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({
        teacherId: 't1',
        classId: 'c8',
        sectionId: 's8a',
        subjectId: 'sci',
        startDate: '2026-09-28',
        endDate: '2026-10-03',
        templateId: 'tpl-ssc',
      }),
    );
    expect(await screen.findByText('6 lessons planned')).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith('Plan created with 6 lessons');
  });

  it('shows the skipped holiday / exam days in the result', async () => {
    vi.spyOn(lessonPlannerApi, 'generatePlan').mockResolvedValue({
      data: { plan: { id: 'plan-x' }, placedCount: 4, skippedDays: ['2026-09-30'], unscheduled: [] },
    });
    renderPage();
    chooseClass();
    fireEvent.click(generateBtn());
    expect(await screen.findByText(/Skipped:/)).toHaveTextContent('30 Sept');
  });
});