import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KiroGhost } from './KiroGhost';

describe('KiroGhost', () => {
  it('renders an svg with the ghost test id', () => {
    render(<KiroGhost label="Kiro" />);
    const ghost = screen.getByTestId('kiro-ghost');
    expect(ghost.tagName.toLowerCase()).toBe('svg');
  });

  it('is accessible via role img when labelled', () => {
    render(<KiroGhost label="Kiro the mascot" />);
    expect(screen.getByRole('img', { name: 'Kiro the mascot' })).toBeInTheDocument();
  });

  it('is hidden from assistive tech when unlabelled (decorative use)', () => {
    render(<KiroGhost label="" />);
    const ghost = screen.getByTestId('kiro-ghost');
    expect(ghost).toHaveAttribute('aria-hidden', 'true');
  });

  it('reflects the mood prop on the root element for visual state inspection', () => {
    render(<KiroGhost label="" mood="celebrating" />);
    expect(screen.getByTestId('kiro-ghost')).toHaveAttribute('data-mood', 'celebrating');
  });
});
