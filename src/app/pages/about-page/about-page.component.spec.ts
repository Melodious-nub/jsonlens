import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { AboutPageComponent } from './about-page.component';
import { ToastService } from '../../core/services/toast.service';
import { ExportService } from '../../core/services/export.service';

describe('AboutPageComponent', () => {
  let exportService: ExportService;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutPageComponent],
      providers: [provideRouter([]), ToastService, ExportService],
    }).compileComponents();

    exportService = TestBed.inject(ExportService);
    toastService = TestBed.inject(ToastService);
  });

  it('should instantiate and display features, faqs, and creator details', () => {
    const fixture = TestBed.createComponent(AboutPageComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
    expect(comp.creatorName).toBe('Shawon Talukder');
    expect(comp.creatorRole).toContain('Green Delta Insurance PLC');
    expect(comp.features.length).toBeGreaterThanOrEqual(6);
    expect(comp.faqs.length).toBeGreaterThanOrEqual(7);
    expect(comp.creatorProjects.length).toBeGreaterThanOrEqual(3);
    const titles = comp.creatorProjects.map((p) => p.title);
    expect(titles).toContain('FundFlow');
    expect(titles).toContain('ScreenLocker');
    expect(titles).toContain('JsonLens');
    expect(comp.connectLinks.length).toBeGreaterThanOrEqual(4);
  });

  it('should toggle FAQ accordion items', () => {
    const fixture = TestBed.createComponent(AboutPageComponent);
    const comp = fixture.componentInstance;

    // First FAQ open by default
    expect(comp.isFaqOpen(0)).toBe(true);
    expect(comp.isFaqOpen(1)).toBe(false);

    // Toggle second FAQ open
    comp.toggleFaq(1);
    expect(comp.isFaqOpen(1)).toBe(true);

    // Toggle first FAQ closed
    comp.toggleFaq(0);
    expect(comp.isFaqOpen(0)).toBe(false);
  });

  it('should copy creator email to clipboard', async () => {
    vi.spyOn(exportService, 'copyToClipboard').mockResolvedValue(true);
    const toastSpy = vi.spyOn(toastService, 'show');

    const fixture = TestBed.createComponent(AboutPageComponent);
    const comp = fixture.componentInstance;

    await comp.onCopyEmail();
    expect(exportService.copyToClipboard).toHaveBeenCalledWith('shawon.taluckder2@gmail.com');
    expect(comp.isEmailCopied()).toBe(true);
    expect(toastSpy).toHaveBeenCalledWith('Copied creator email to clipboard!', 'success');
  });

  it('should validate contact form before sending', async () => {
    const toastSpy = vi.spyOn(toastService, 'show');
    const fixture = TestBed.createComponent(AboutPageComponent);
    const comp = fixture.componentInstance;

    await comp.onSendContact();
    expect(toastSpy).toHaveBeenCalledWith('Please fill in Name, Email, and Message', 'error');

    // Invalid email format test
    comp.contactName.set('Alex');
    comp.contactEmail.set('not-an-email');
    comp.contactMessage.set('Hello Shawon');

    await comp.onSendContact();
    expect(toastSpy).toHaveBeenCalledWith('Please enter a valid email address', 'error');
  });

  it('should silently discard submissions if honeypot is filled by bot', async () => {
    const toastSpy = vi.spyOn(toastService, 'show');
    const fixture = TestBed.createComponent(AboutPageComponent);
    const comp = fixture.componentInstance;

    comp.contactName.set('SpamBot');
    comp.contactEmail.set('bot@spam.com');
    comp.contactMessage.set('Buy something');
    comp.contactHoneypot.set('spam_trap_value');

    await comp.onSendContact();
    expect(comp.contactName()).toBe('');
    expect(comp.contactHoneypot()).toBe('');
    expect(toastSpy).toHaveBeenCalledWith('Message delivered directly to Shawon!', 'success');
  });

  it('should send contact form via fetch to FormSubmit.co on valid input', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: 'true', message: 'The form was submitted successfully.' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const toastSpy = vi.spyOn(toastService, 'show');
    const fixture = TestBed.createComponent(AboutPageComponent);
    const comp = fixture.componentInstance;

    comp.contactName.set('Alex Dev');
    comp.contactEmail.set('alex@example.com');
    comp.contactSubject.set('Feature Request');
    comp.contactMessage.set('I love JsonLens! Can we get CSV import?');

    await comp.onSendContact();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('formsubmit.co/ajax/shawon.taluckder2%40gmail.com'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })
    );

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody.name).toBe('Alex Dev');
    expect(requestBody.email).toBe('alex@example.com');
    expect(requestBody._subject).toBe('[JsonLens Contact] Feature Request');
    expect(requestBody._captcha).toBe('false');

    expect(comp.contactName()).toBe('');
    expect(comp.contactEmail()).toBe('');
    expect(comp.isSubmitting()).toBe(false);
    expect(toastSpy).toHaveBeenCalledWith(
      'Message delivered directly to Shawon! Thank you for reaching out.',
      'success'
    );

    vi.unstubAllGlobals();
  });
});
