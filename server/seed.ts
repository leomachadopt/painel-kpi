import pool from './db.js'

const seed = async () => {
  console.log('Starting database seeding...')

  try {
    const client = await pool.connect()

    // Insert default clinics (using same IDs as frontend mock data)
    const clinic1Result = await client.query(`
      INSERT INTO clinics (
        id, name, owner_name, active, last_update,
        target_revenue, target_aligners_min, target_aligners_max,
        target_avg_ticket, target_acceptance_rate, target_occupancy_rate,
        target_nps, target_integration_rate, target_attendance_rate,
        target_follow_up_rate, target_wait_time, target_complaints,
        target_leads_min, target_leads_max, target_revenue_per_cabinet,
        target_plans_presented_adults, target_plans_presented_kids,
        target_agenda_operational, target_agenda_planning,
        target_agenda_sales, target_agenda_leadership
      ) VALUES (
        'clinic-1',
        'Clínica Sorriso Radiante',
        'Dr. Pedro Santos',
        true,
        'Outubro 2023',
        83500, 11, 12, 1200, 65, 70, 80, 85, 80, 100, 10, 2, 80, 100, 25000, 15, 20,
        30, 20, 30, 20
      ) ON CONFLICT (id) DO NOTHING
      RETURNING id
    `)

    const clinic2Result = await client.query(`
      INSERT INTO clinics (
        id, name, owner_name, active, last_update,
        target_revenue, target_aligners_min, target_aligners_max,
        target_avg_ticket, target_acceptance_rate, target_occupancy_rate,
        target_nps, target_integration_rate, target_attendance_rate,
        target_follow_up_rate, target_wait_time, target_complaints,
        target_leads_min, target_leads_max, target_revenue_per_cabinet,
        target_plans_presented_adults, target_plans_presented_kids,
        target_agenda_operational, target_agenda_planning,
        target_agenda_sales, target_agenda_leadership
      ) VALUES (
        'clinic-2',
        'Centro Médico Vida',
        'Dra. Maria Oliveira',
        true,
        'Setembro 2023',
        100000, 15, 20, 1500, 70, 75, 85, 85, 85, 95, 8, 1, 100, 120, 30000, 20, 25,
        40, 10, 30, 20
      ) ON CONFLICT (id) DO NOTHING
      RETURNING id
    `)

    const clinic1Id = clinic1Result.rows[0]?.id || 'clinic-1'
    const clinic2Id = clinic2Result.rows[0]?.id || 'clinic-2'

    // Insert users
    await client.query(`
      INSERT INTO users (id, name, email, password_hash, role, clinic_id)
      VALUES
        ('mentor-1', 'Dra. Ana Mentora', 'mentor@kpipanel.com', 'mentor123', 'MENTOR', NULL),
        ('manager-1', 'Gestor da Clínica', 'clinica@kpipanel.com', 'clinica123', 'GESTOR_CLINICA', $1)
      ON CONFLICT (email) DO NOTHING
    `, [clinic1Id])

    // Insert clinic configurations
    const categories = [
      { id: 'cat-1', name: 'Alinhadores' },
      { id: 'cat-2', name: 'Odontopediatria' },
      { id: 'cat-3', name: 'Dentisteria' },
      { id: 'cat-4', name: 'Cirurgia' },
      { id: 'cat-5', name: 'Outros' },
    ]

    for (const clinic of [clinic1Id, clinic2Id]) {
      for (const cat of categories) {
        const catId = `${cat.id}-${clinic}`
        await client.query(
          'INSERT INTO clinic_categories (id, clinic_id, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [catId, clinic, cat.name]
        )
      }

      // Cabinets
      const cabinetPrefix = clinic === clinic1Id ? 'gab-' : 'gab2-'
      await client.query(
        `INSERT INTO clinic_cabinets (id, clinic_id, name, standard_hours) VALUES
          ($1, $2, 'Gabinete 1', 8),
          ($3, $2, 'Gabinete 2', 8)
        ON CONFLICT DO NOTHING`,
        [`${cabinetPrefix}1`, clinic, `${cabinetPrefix}2`]
      )

      // Doctors
      const doctorPrefix = clinic === clinic1Id ? 'doc-' : 'doc2-'
      await client.query(
        `INSERT INTO clinic_doctors (id, clinic_id, name) VALUES
          ($1, $2, 'Dr. Pedro Santos'),
          ($3, $2, 'Dra. Ana Silva')
        ON CONFLICT DO NOTHING`,
        [`${doctorPrefix}1`, clinic, `${doctorPrefix}2`]
      )

      // Sources
      const sources = [
        { id: 'src-1', name: 'Google Ads' },
        { id: 'src-2', name: 'Meta Ads' },
        { id: 'src-3', name: 'Indicação' },
        { id: 'src-4', name: 'Passante' },
        { id: 'src-5', name: 'Pesquisa Orgânica' },
        { id: 'src-6', name: 'Amigo' },
      ]
      for (const source of sources) {
        const srcId = `${source.id}-${clinic}`
        await client.query(
          'INSERT INTO clinic_sources (id, clinic_id, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [srcId, clinic, source.name]
        )
      }

      // Campaigns
      const campaigns = [
        { id: 'camp-1', name: 'Verão 2024' },
        { id: 'camp-2', name: 'Regresso às Aulas' },
        { id: 'camp-3', name: 'Institucional' },
      ]
      for (const campaign of campaigns) {
        const campId = `${campaign.id}-${clinic}`
        await client.query(
          'INSERT INTO clinic_campaigns (id, clinic_id, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [campId, clinic, campaign.name]
        )
      }
    }

    client.release()
    console.log('✅ Database seeding completed successfully!')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

seed()
