export type FormValidationProblem = {
  id: string;
  label: string;
  message: string;
  section?: string;
};

/** Mark invalid native controls and collect their labels for the form's error summary. */
export function validateFormControls(form: HTMLFormElement | null): FormValidationProblem[] {
  return [...(form?.elements ?? [])].flatMap((element) => {
    if (
      !(
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
      )
    )
      return [];
    element.removeAttribute('aria-invalid');
    if (element.checkValidity()) return [];
    element.setAttribute('aria-invalid', 'true');
    return [
      {
        id: element.id,
        label: [...(element.labels ?? [])]
          .map((label) => label.textContent)
          .join(' ')
          .trim(),
        message: element.validationMessage,
        section: element.closest<HTMLElement>('[data-section]')?.dataset.section,
      },
    ];
  });
}
