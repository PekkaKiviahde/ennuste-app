import AcceptInviteForm from "../../../ui/invites/AcceptInviteForm";

export default function InvitePage({ params }: { params: { token: string } }) {
  return (
    <div className="container">
      <AcceptInviteForm token={params.token} />
    </div>
  );
}
