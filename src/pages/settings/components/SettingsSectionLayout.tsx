import type { PropsWithChildren } from "react";
import Card from "@/components/ui/Card";

type SettingsSectionLayoutProps = PropsWithChildren<{
  title?: string;
}>;

const SettingsSectionLayout = ({ title = "Settings", children }: SettingsSectionLayoutProps) => (
  <div className="page settings-page">
    <Card title={title}>{children}</Card>
  </div>
);

export default SettingsSectionLayout;
