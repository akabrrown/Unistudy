import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiUrl = 'https://list-of-universities-in-ghana.onrender.com/universities'
      
    const response = await fetch(apiUrl, {
      next: { revalidate: 86400 } // Cache results for 24 hours
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    // The list-of-universities-in-ghana API returns { status: true, universities: [...] }
    const universitiesArray = data.universities || data
    return NextResponse.json(universitiesArray)
  } catch (error) {
    console.error('Ghana universities proxy error:', error)
    
    // Server-side fallback static seed data
    const fallbackList = [
      { name: "University of Ghana" },
      { name: "Kwame Nkrumah University of Science and Technology" },
      { name: "University of Cape Coast" },
      { name: "University for Development Studies" },
      { name: "University of Education, Winneba" },
      { name: "University of Mines and Technology" },
      { name: "University of Professional Studies, Accra" },
      { name: "Ghana Institute of Management and Public Administration" },
      { name: "University of Energy and Natural Resources" },
      { name: "University of Health and Allied Sciences" },
      { name: "C.K. Tedam University of Technology and Applied Sciences" },
      { name: "Simon Diedong Dombo University of Business and Integrated Development Studies" },
      { name: "Akenten Appiah-Menka University of Skills Training and Entrepreneurial Development" },
      { name: "Ghana Communication Technology University" },
      { name: "Accra Technical University" },
      { name: "Kumasi Technical University" },
      { name: "Takoradi Technical University" },
      { name: "Cape Coast Technical University" },
      { name: "Koforidua Technical University" },
      { name: "Sunyani Technical University" },
      { name: "Ho Technical University" },
      { name: "Tamale Technical University" },
      { name: "Bolgatanga Technical University" },
      { name: "Wa Technical University" },
      { name: "Ashesi University" },
      { name: "Central University" },
      { name: "Academic City University" },
      { name: "Regent University College of Science and Technology" },
      { name: "Valley View University" },
      { name: "Methodist University Ghana" },
      { name: "Presbyterian University, Ghana" },
      { name: "All Nations University" },
      { name: "Accra Institute of Technology" },
      { name: "Ghana Christian University College" },
      { name: "Lancaster University Ghana" },
      { name: "Wisconsin International University College" },
      { name: "Garden City University College" },
      { name: "KAAF University College" },
      { name: "Radford University College" },
      { name: "BlueCrest University College" },
      { name: "Zenith University College" },
      { name: "Islamic University College Ghana" },
      { name: "Dominion University College" },
      { name: "Christ Apostolic University College" },
      { name: "Catholic University College of Ghana" },
      { name: "Ghana Baptist University College" },
      { name: "Anglican University College of Technology" },
      { name: "Accra Metropolitan University" }
    ]
    return NextResponse.json(fallbackList)
  }
}
