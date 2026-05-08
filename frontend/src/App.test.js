import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login page', async () => {
  render(<App />);
  const titleElement = await screen.findByText(/chào mừng bạn quay lại/i);
  expect(titleElement).toBeInTheDocument();
});
