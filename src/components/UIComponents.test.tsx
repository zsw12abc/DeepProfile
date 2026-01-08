import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Card, InputGroup } from './UIComponents';

describe('UIComponents', () => {
  describe('Card', () => {
    it('renders title and children correctly', () => {
      render(
        <Card title="Test Title">
          <div>Child Content</div>
        </Card>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('renders icon when provided', () => {
      render(
        <Card title="Test Title" icon={<span data-testid="icon">icon</span>}>
          <div>Child Content</div>
        </Card>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });
  });

  describe('InputGroup', () => {
    it('renders label and children correctly', () => {
      render(
        <InputGroup label="Test Label">
          <input type="text" />
        </InputGroup>
      );

      expect(screen.getByText('Test Label')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders subLabel when provided', () => {
      render(
        <InputGroup label="Test Label" subLabel="Test SubLabel">
          <input type="text" />
        </InputGroup>
      );

      expect(screen.getByText('Test SubLabel')).toBeInTheDocument();
    });
  });
});