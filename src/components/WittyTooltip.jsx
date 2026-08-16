import React from 'react';
import { Info } from 'lucide-react';

const WITTY_MESSAGES = {
  'current problems': 'Like git merge conflicts, but for your feelings.',
  'key learnings': 'Things I realized today that I will probably forget by tomorrow morning.',
  'identified strengths': "Proof that I'm actually a functioning human being, despite what my logs suggest.",
  'key quotes': 'Mandatory daily mantras to prevent throwing my laptop out the window.',
  'goals': 'A list of things I hope to do, but will likely procrastinate on until Q4.',
  'todos': "Reminder: Don't put 'pee every morning' or 'exist' here. Keep it real."
};

export default function WittyTooltip({ section = '' }) {
  const cleanSection = section.toLowerCase().trim();
  const message = WITTY_MESSAGES[cleanSection] || 'Whatever nuanced plans you have. Cooking, world domination, shopping list... go wild.';

  return (
    <div className="tooltip-container">
      <Info 
        size={13} 
        style={{ 
          color: 'var(--text-secondary)', 
          opacity: 0.6,
          transition: 'opacity 0.2s',
          cursor: 'pointer'
        }} 
        className="info-hover-icon"
      />
      <div className="tooltip-text">
        {message}
      </div>
    </div>
  );
}
