import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app main heading or brand (Books / LawyerHub / Manage Books / Loading)', () => {
  render(<App />);
  // Use queryAllByText so we tolerate multiple matches (buttons + headings).
  const booksMatches = screen.queryAllByText(/Books/i);
  const lawyerHubMatches = screen.queryAllByText(/LawyerHub/i);
  const manageBooksMatches = screen.queryAllByText(/Manage Books/i);
  const loadingMatches = screen.queryAllByText(/Loading/i);

  const totalMatches =
    booksMatches.length +
    lawyerHubMatches.length +
    manageBooksMatches.length +
    loadingMatches.length;

  expect(totalMatches).toBeGreaterThan(0);
});
