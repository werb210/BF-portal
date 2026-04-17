import type { PropsWithChildren } from "react";

type SettingsSectionLayoutProps = PropsWithChildren<{
  title?: string;
}>;

const SettingsSectionLayout = ({ children }: SettingsSectionLayoutProps) => (
  <div className="page settings-page settings-shell">{children}</div>
);

export default SettingsSectionLayout;
