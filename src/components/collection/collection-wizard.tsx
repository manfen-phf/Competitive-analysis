type CollectionWizardProps = {
  activeStep: number;
  steps: readonly string[];
};

export function CollectionWizard({ activeStep, steps }: CollectionWizardProps) {
  return <ol className="collection-wizard" aria-label="采集步骤">
    {steps.map((step, index) => <li key={step} data-state={index < activeStep ? "done" : index === activeStep ? "active" : "pending"}>
      <span aria-hidden="true">{index < activeStep ? "✓" : index + 1}</span><strong>{step}</strong>
    </li>)}
  </ol>;
}
