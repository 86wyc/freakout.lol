type SettingsSectionHeaderProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

export function SettingsSectionHeader({
  icon,
  title,
  description,
}: SettingsSectionHeaderProps) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-sm text-foreground/60">{description}</p>
      </div>
    </div>
  );
}
