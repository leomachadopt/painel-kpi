import fs from 'fs';
import path from 'path';

const languages = ['pt-PT', 'pt-BR', 'en', 'es', 'fr', 'it'];

const translations = {
  'pt-PT': {
    sidebar: { team: 'Equipa' },
    team: {
      title: 'Equipa',
      description: 'Gerir médicos e colaboradores da clínica',
      doctors: 'Médicos',
      collaborators: 'Colaboradores',
      doctorsInfo: 'Informação sobre Médicos',
      doctorsDescription: 'Médicos têm permissões padrão para editar suas consultas, visualizar relatórios e editar pacientes.',
      realEmails: 'Emails reais',
      fictitiousEmails: 'Emails fictícios',
      doctorsList: 'Lista de Médicos',
      doctorsWithAccess: 'Médicos registados no sistema',
      noDoctorsRegistered: 'Nenhum médico registado',
      name: 'Nome',
      email: 'Email',
      whatsapp: 'WhatsApp',
      status: 'Estado',
      actions: 'Ações',
      fictitious: 'Fictício',
      hasAccount: 'Tem conta',
      noAccount: 'Sem conta',
      permissions: 'Permissões',
      permissionsComingSoon: 'Gestão de permissões em breve',
      errorLoadingDoctors: 'Erro ao carregar médicos'
    }
  },
  'pt-BR': {
    sidebar: { team: 'Equipe' },
    team: {
      title: 'Equipe',
      description: 'Gerenciar médicos e colaboradores da clínica',
      doctors: 'Médicos',
      collaborators: 'Colaboradores',
      doctorsInfo: 'Informação sobre Médicos',
      doctorsDescription: 'Médicos têm permissões padrão para editar suas consultas, visualizar relatórios e editar pacientes.',
      realEmails: 'Emails reais',
      fictitiousEmails: 'Emails fictícios',
      doctorsList: 'Lista de Médicos',
      doctorsWithAccess: 'Médicos registrados no sistema',
      noDoctorsRegistered: 'Nenhum médico registrado',
      name: 'Nome',
      email: 'Email',
      whatsapp: 'WhatsApp',
      status: 'Status',
      actions: 'Ações',
      fictitious: 'Fictício',
      hasAccount: 'Tem conta',
      noAccount: 'Sem conta',
      permissions: 'Permissões',
      permissionsComingSoon: 'Gerenciamento de permissões em breve',
      errorLoadingDoctors: 'Erro ao carregar médicos'
    }
  },
  'en': {
    sidebar: { team: 'Team' },
    team: {
      title: 'Team',
      description: 'Manage clinic doctors and staff',
      doctors: 'Doctors',
      collaborators: 'Staff',
      doctorsInfo: 'Doctors Information',
      doctorsDescription: 'Doctors have default permissions to edit their consultations, view reports and edit patients.',
      realEmails: 'Real emails',
      fictitiousEmails: 'Fictitious emails',
      doctorsList: 'Doctors List',
      doctorsWithAccess: 'Doctors registered in the system',
      noDoctorsRegistered: 'No doctors registered',
      name: 'Name',
      email: 'Email',
      whatsapp: 'WhatsApp',
      status: 'Status',
      actions: 'Actions',
      fictitious: 'Fictitious',
      hasAccount: 'Has account',
      noAccount: 'No account',
      permissions: 'Permissions',
      permissionsComingSoon: 'Permissions management coming soon',
      errorLoadingDoctors: 'Error loading doctors'
    }
  },
  'es': {
    sidebar: { team: 'Equipo' },
    team: {
      title: 'Equipo',
      description: 'Gestionar médicos y colaboradores de la clínica',
      doctors: 'Médicos',
      collaborators: 'Colaboradores',
      doctorsInfo: 'Información sobre Médicos',
      doctorsDescription: 'Los médicos tienen permisos predeterminados para editar sus consultas, ver informes y editar pacientes.',
      realEmails: 'Emails reales',
      fictitiousEmails: 'Emails ficticios',
      doctorsList: 'Lista de Médicos',
      doctorsWithAccess: 'Médicos registrados en el sistema',
      noDoctorsRegistered: 'No hay médicos registrados',
      name: 'Nombre',
      email: 'Email',
      whatsapp: 'WhatsApp',
      status: 'Estado',
      actions: 'Acciones',
      fictitious: 'Ficticio',
      hasAccount: 'Tiene cuenta',
      noAccount: 'Sin cuenta',
      permissions: 'Permisos',
      permissionsComingSoon: 'Gestión de permisos próximamente',
      errorLoadingDoctors: 'Error al cargar médicos'
    }
  },
  'fr': {
    sidebar: { team: 'Équipe' },
    team: {
      title: 'Équipe',
      description: 'Gérer les médecins et le personnel de la clinique',
      doctors: 'Médecins',
      collaborators: 'Personnel',
      doctorsInfo: 'Informations sur les Médecins',
      doctorsDescription: 'Les médecins ont des autorisations par défaut pour modifier leurs consultations, afficher les rapports et modifier les patients.',
      realEmails: 'Emails réels',
      fictitiousEmails: 'Emails fictifs',
      doctorsList: 'Liste des Médecins',
      doctorsWithAccess: 'Médecins enregistrés dans le système',
      noDoctorsRegistered: 'Aucun médecin enregistré',
      name: 'Nom',
      email: 'Email',
      whatsapp: 'WhatsApp',
      status: 'Statut',
      actions: 'Actions',
      fictitious: 'Fictif',
      hasAccount: 'A un compte',
      noAccount: 'Pas de compte',
      permissions: 'Autorisations',
      permissionsComingSoon: 'Gestion des autorisations bientôt',
      errorLoadingDoctors: 'Erreur lors du chargement des médecins'
    }
  },
  'it': {
    sidebar: { team: 'Squadra' },
    team: {
      title: 'Squadra',
      description: 'Gestisci medici e collaboratori della clinica',
      doctors: 'Medici',
      collaborators: 'Collaboratori',
      doctorsInfo: 'Informazioni sui Medici',
      doctorsDescription: 'I medici hanno permessi predefiniti per modificare le loro consultazioni, visualizzare report e modificare pazienti.',
      realEmails: 'Email reali',
      fictitiousEmails: 'Email fittizi',
      doctorsList: 'Elenco dei Medici',
      doctorsWithAccess: 'Medici registrati nel sistema',
      noDoctorsRegistered: 'Nessun medico registrato',
      name: 'Nome',
      email: 'Email',
      whatsapp: 'WhatsApp',
      status: 'Stato',
      actions: 'Azioni',
      fictitious: 'Fittizio',
      hasAccount: 'Ha un account',
      noAccount: 'Nessun account',
      permissions: 'Permessi',
      permissionsComingSoon: 'Gestione permessi prossimamente',
      errorLoadingDoctors: 'Errore durante il caricamento dei medici'
    }
  }
};

languages.forEach(lang => {
  const filePath = `src/locales/${lang}/common.json`;
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Add sidebar.team
    if (!content.sidebar.team) {
      content.sidebar.team = translations[lang].sidebar.team;
    }
    
    // Add team section
    if (!content.team) {
      content.team = translations[lang].team;
    }
    
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
    console.log(`✅ Updated ${lang}/common.json`);
  } catch (error) {
    console.error(`❌ Error updating ${lang}/common.json:`, error.message);
  }
});

console.log('\n✅ All translations updated!');
