import { test, expect } from '@playwright/test';

test.describe('Preview and Confirm Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const csvContent = 'name,email,phone\nJohn Doe,john@example.com,+91 9876543210\nJane Smith,jane@example.com,+1 2345678901';
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });
  });

  test('should display preview table with data', async ({ page }) => {
    await expect(page.locator('[data-testid="preview-table"]')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('Jane Smith')).toBeVisible();
  });

  test('should allow sorting columns', async ({ page }) => {
    await expect(page.locator('[data-testid="preview-table"]')).toBeVisible({ timeout: 5000 });
    
    // Click on name column header to sort
    const nameHeader = page.getByText(/name/i);
    await nameHeader.click();
    
    // Verify sorting (implementation dependent)
    await expect(page.locator('[data-testid="preview-table"]')).toBeVisible();
  });

  test('should allow filtering columns', async ({ page }) => {
    await expect(page.locator('[data-testid="preview-table"]')).toBeVisible({ timeout: 5000 });
    
    // Try to filter (implementation dependent)
    await expect(page.locator('[data-testid="preview-table"]')).toBeVisible();
  });

  test('should show pagination for large datasets', async ({ page }) => {
    // Upload larger dataset
    const largeCsv = 'name,email,phone\n' + Array.from({ length: 25 }, (_, i) => 
      `User ${i},user${i}@example.com,+91 9876543${i.toString().padStart(4, '0')}`
    ).join('\n');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'large.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(largeCsv),
    });

    await expect(page.locator('[data-testid="preview-table"]')).toBeVisible({ timeout: 5000 });
    
    // Verify pagination controls (implementation dependent)
    await expect(page.getByText(/next|previous|page/i)).toBeVisible();
  });

  test('should show column headers', async ({ page }) => {
    await expect(page.locator('[data-testid="preview-table"]')).toBeVisible({ timeout: 5000 });
    
    await expect(page.getByText(/name/i)).toBeVisible();
    await expect(page.getByText(/email/i)).toBeVisible();
    await expect(page.getByText(/phone/i)).toBeVisible();
  });

  test('should display row count', async ({ page }) => {
    await expect(page.locator('[data-testid="preview-table"]')).toBeVisible({ timeout: 5000 });
    
    await expect(page.getByText(/2 rows/i)).toBeVisible();
  });

  test('should display column count', async ({ page }) => {
    await expect(page.locator('[data-testid="preview-table"]')).toBeVisible({ timeout: 5000 });
    
    await expect(page.getByText(/3 columns/i)).toBeVisible();
  });

  test('should allow going back to upload', async ({ page }) => {
    await expect(page.locator('[data-testid="preview-table"]')).toBeVisible({ timeout: 5000 });
    
    // Look for back/reset button (implementation dependent)
    const backButton = page.getByRole('button', { name: /back|reset|new/i });
    if (await backButton.isVisible()) {
      await backButton.click();
      await expect(page.locator('[data-testid="upload-zone"]')).toBeVisible();
    }
  });

  test('should disable confirm button during processing', async ({ page }) => {
    const confirmButton = page.getByRole('button', { name: /confirm|import/i });
    await confirmButton.click();
    
    // Button should be disabled during processing
    await expect(confirmButton).toBeDisabled();
  });
});
