import { useNavigate } from 'react-router-dom';

import { useApp } from '@/context/AppContext';
import {
  LP_BASE,
  lpPages,
} from '@/routes/routeConfig';


import './LessonPlannerHome.css';



export default function LessonPlannerHome() {
  const navigate = useNavigate();
  const { role } = useApp();

  const availablePages = lpPages.filter((page) =>
    page.roles.includes(role)
  );

  return (
    <div className="lesson-planner-home">
      

      <div className="lesson-planner-menu">
        {availablePages.map((page) => {
          const Icon = page.icon;

          const label =
            role === 'teacher' &&
            page.teacherLabel
              ? page.teacherLabel
              : page.label;

          return (
            <button
              key={page.path}
              type="button"
              className="lesson-planner-card"
              onClick={() =>
                navigate(
                  `${LP_BASE}/${page.path}`
                )
              }
            >
              <div className="lesson-planner-card-icon">
                <Icon size={36} />
              </div>

              <span className="lesson-planner-card-title">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}