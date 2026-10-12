/** Public pages use the same viewer from guest browsing and both member dashboards. */
export function openWebsitePage(navigation: { navigate: (name: string, params: any) => void }, path: string, title = 'ACTIV') {
  navigation.navigate('WebsiteViewer', { path, title, publicAccess: true });
}
