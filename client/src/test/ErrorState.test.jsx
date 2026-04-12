import { fireEvent, render, screen } from '@testing-library/react';
import ErrorState from '../components/common/ErrorState';

describe('ErrorState accessibility and retry flow', () => {
  it('renders alert content and triggers retry action via keyboard', () => {
    const onAction = jest.fn();

    render(
      <ErrorState
        title="Validation error"
        message="Review slide fields"
        actionLabel="Retry"
        onAction={onAction}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: 'Retry' });
    retryButton.focus();
    expect(retryButton).toHaveFocus();

    fireEvent.keyDown(retryButton, { key: 'Enter', code: 'Enter' });
    fireEvent.click(retryButton);

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
