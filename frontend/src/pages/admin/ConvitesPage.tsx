import { InvitesTab } from "../../components/company/InvitesTab";
import { PageHeader } from "../../components/common/PageHeader";

export function ConvitesPage() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Convites de Acesso"
        subtitle="Envie convites e QR Codes para novos colaboradores"
        helpText="Gere links e QR Codes de convite para que novos colaboradores realizem o cadastro da biometria facial no próprio smartphone."
      />
      <InvitesTab />
    </div>
  );
}
