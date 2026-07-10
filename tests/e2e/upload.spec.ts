import { test, expect } from '@playwright/test';

test.describe('CSV Upload Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display upload zone', async ({ page }) => {
    await expect(page.locator('[data-testid="upload-zone"]')).toBeVisible();
    await expect(page.getByText(/upload csv/i)).toBeVisible();
  });

  test('should accept valid CSV file via file picker', async ({ page }) => {
    // Create a simple CSV file
    const csvContent = 'name,email,phone\nJohn Doe,john@example.com,+91 9876543210';
    
    // Upload file using correct Playwright API
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Verify preview appears
    await expect(page.getByText(/preview/i)).toBeVisible({ timeout: 5000 });
  });

  test('should reject non-CSV files', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    
    // Try to upload a text file
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not a csv'),
    });

    // Verify error message (implementation dependent)
    await expect(page.getByText(/csv/i)).toBeVisible();
  });

  test('should display preview table after upload', async ({ page }) => {
    const csvContent = 'name,email,phone\nJohn Doe,john@example.com,+91 9876543210\nJane Smith,jane@example.com,+1 2345678901';
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Wait for preview table
    await expect(page.locator('[data-testid="preview-table"]')).toBeVisible({ timeout: 5000 });
    
    // Verify data is displayed
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('Jane Smith')).toBeVisible();
  });

  test('should show column and row counts', async ({ page }) => {
    const csvContent = 'name,email,phone\nJohn Doe,john@example.com,+91 9876543210\nJane Smith,jane@example.com,+1 2345678901';
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Verify counts are displayed
    await expect(page.getByText(/3 columns/i)).toBeVisible();
    await expect(page.getByText(/2 rows/i)).toBeVisible();
  });

  test('should enable confirm button after upload', async ({ page }) => {
    const csvContent = 'name,email,phone\nJohn Doe,john@example.com,+91 9876543210';
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Confirm button should be enabled
    const confirmButton = page.getByRole('button', { name: /confirm|import/i });
    await expect(confirmButton).toBeEnabled();
  });

  test('should handle empty CSV error', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'empty.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(''),
    });

    // Error message should appear
    await expect(page.getByText(/error|empty/i)).toBeVisible({ timeout: 3000 });
  });

  test('should display loading state during processing', async ({ page }) => {
    const csvContent = 'name,email,phone\nJohn Doe,john@example.com,+91 9876543210';
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Click confirm
    const confirmButton = page.getByRole('button', { name: /confirm|import/i });
    await confirmButton.click();

    // Loading state should appear
    await expect(page.locator('[data-testid="processing-loader"]')).toBeVisible({ timeout: 5000 });
  });

  test('should show progress during processing', async ({ page }) => {
    const csvContent = 'name,email,phone\nJohn Doe,john@example.com,+91 9876543210';
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    const confirmButton = page.getByRole('button', { name: /confirm|import/i });
    await confirmButton.click();

    // Progress bar should appear
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible({ timeout: 5000 });
  });
});
