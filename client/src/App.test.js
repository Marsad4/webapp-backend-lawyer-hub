import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app main heading or brand', () => {
  render(<App />);
  // app contains headings like "Books", "LawyerHub" or "Manage Books"
  const heading =
    screen.queryByText(/Books/i) ||
    screen.queryByText(/LawyerHub/i) ||
    screen.queryByText(/Manage Books/i) ||
    screen.queryByText(/Loading.../i);
  expect(heading).toBeInTheDocument();
});
