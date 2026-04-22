-- Allow authenticated users to delete members (required for the "Clear all" reset feature)
CREATE POLICY "auth_members_delete" ON members
  FOR DELETE TO authenticated USING (true);
