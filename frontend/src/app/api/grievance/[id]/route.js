import { NextResponse } from "next/server";

// In-memory / Mock Detailed Grievances Store
const DETAILED_GRIEVANCES = {
  "CIGA-849201-412": {
    id: "CIGA-849201-412",
    title: "Deep Pothole at Junction",
    category: "pothole",
    status: "pending",
    isUrgent: true,
    isOverdue: true,
    coordinates: { lat: 23.234158, lng: 72.500038 },
    address: "Ward 4 - S.G. Highway near Junction, Ahmedabad",
    createdAt: "2026-10-02T10:30:00Z",
    age: "3d old",
    citizenReport: {
      photoUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=700&auto=format&fit=crop&q=80",
      originalTranscript: "અહીં રસ્તા પર બહુ મોટો ખાડો પડી ગયો છે, બાઈક ચાલકો પડી જાય છે.",
      originalLanguage: "Gujarati",
      englishMeaning: "There is a very large pothole on the road here, two-wheeler riders are frequently falling over.",
    },
    aiAnalysis: {
      detectedCategory: "Severe Road Pothole",
      confidenceScore: 96.4,
      priority: "Critical (SLA: 24h)",
      assignedDept: "Roads & Civil Works Division",
      reasoning: "Road crater exceeding 25cm depth with sharp asphalt edges posing high collision and casualty risk.",
    },
    history: [
      { status: "Received", time: "Oct 2, 10:30 AM", note: "Reported via citizen voice app" },
      { status: "AI Triaged", time: "Oct 2, 10:30 AM", note: "Classified as Pothole (96.4% confidence)" },
      { status: "Acknowledged", time: "Oct 2, 12:45 PM", note: "Superintending Engineer Verma assigned inspection crew" },
      { status: "Overdue", time: "Oct 3, 10:30 AM", note: "Resolution SLA exceeded 24-hour priority limit" },
    ],
  },
  "CIGA-732104-981": {
    id: "CIGA-732104-981",
    title: "Streetlight Fixture Dark",
    category: "streetlight",
    status: "processing",
    isUrgent: false,
    isOverdue: false,
    coordinates: { lat: 23.23439, lng: 72.50025 },
    address: "Ward 4 - Main St Lamppost #14",
    createdAt: "2026-10-05T09:15:00Z",
    age: "6h old",
    citizenReport: {
      photoUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700&auto=format&fit=crop&q=80",
      originalTranscript: "स्ट्रीट लाइट रात को बंद रहती है, अंधेरे में चलना मुश्किल है।",
      originalLanguage: "Hindi",
      englishMeaning: "Street light stays off at night, it is difficult and unsafe to walk in the dark.",
    },
    aiAnalysis: {
      detectedCategory: "Streetlight Outage",
      confidenceScore: 94.2,
      priority: "Medium (SLA: 48h)",
      assignedDept: "Electrical & Street Lighting Squad",
      reasoning: "Dead sodium lamp fixture identified, timer wiring replacement needed.",
    },
    history: [
      { status: "Received", time: "Oct 5, 09:15 AM", note: "Reported via web portal" },
      { status: "AI Triaged", time: "Oct 5, 09:16 AM", note: "Classified as Streetlight (94.2% confidence)" },
      { status: "Processing", time: "Oct 5, 11:20 AM", note: "Electrical lineman dispatched with replacement fixture" },
    ],
  },
  "CIGA-884912-301": {
    id: "CIGA-884912-301",
    title: "Underground Water Leak",
    category: "water leak",
    status: "pending",
    isUrgent: true,
    isOverdue: false,
    coordinates: { lat: 23.23395, lng: 72.49982 },
    address: "Ward 4 - Main St Crossway 2",
    createdAt: "2026-10-05T12:05:00Z",
    age: "3h old",
    citizenReport: {
      photoUrl: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=700&auto=format&fit=crop&q=80",
      originalTranscript: "પાણીની પાઇપલાઇન તૂટી ગઈ છે, પીવાનું ચોખ્ખું પાણી રસ્તા પર વહી રહ્યું છે.",
      originalLanguage: "Gujarati",
      englishMeaning: "Water pipeline has burst, clean drinking water is flooding onto the street.",
    },
    aiAnalysis: {
      detectedCategory: "Drinking Water Pipeline Burst",
      confidenceScore: 98.1,
      priority: "Critical (SLA: 12h)",
      assignedDept: "Municipal Water Supply Board",
      reasoning: "Pressurized main line fracture discharging clean potable water onto carriageway.",
    },
    history: [
      { status: "Received", time: "Oct 5, 12:05 PM", note: "Urgent citizen report with GPS" },
      { status: "AI Triaged", time: "Oct 5, 12:06 PM", note: "Emergency classification: Water Leak (98.1% confidence)" },
    ],
  },
  "CIGA-772910-442": {
    id: "CIGA-772910-442",
    title: "Broken Stormwater Drain Grate",
    category: "drain",
    status: "processing",
    isUrgent: false,
    isOverdue: false,
    coordinates: { lat: 23.23452, lng: 72.49971 },
    address: "Ward 4 - Main St Drain Point 7",
    createdAt: "2026-10-04T15:40:00Z",
    age: "1d old",
    citizenReport: {
      photoUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb18f156f?w=700&auto=format&fit=crop&q=80",
      originalTranscript: "गटर का ढक्कन टूटा हुआ है, कोई भी गिर सकता है।",
      originalLanguage: "Hindi",
      englishMeaning: "Drain cover is broken and open, anyone walking by could fall inside.",
    },
    aiAnalysis: {
      detectedCategory: "Missing Drain Grate Hazard",
      confidenceScore: 93.8,
      priority: "High (SLA: 24h)",
      assignedDept: "Drainage & Sewerage Network",
      reasoning: "Broken cast iron grate on main pedestrian footpath causing imminent fall hazard.",
    },
    history: [
      { status: "Received", time: "Oct 4, 03:40 PM", note: "Reported with damage photo" },
      { status: "AI Triaged", time: "Oct 4, 03:41 PM", note: "Classified as Drain (93.8% confidence)" },
      { status: "Processing", time: "Oct 5, 08:00 AM", note: "Barricades placed by civic squad" },
    ],
  },
  "CIGA-661902-881": {
    id: "CIGA-661902-881",
    title: "Secondary Road Surface Crack",
    category: "pothole",
    status: "completed",
    isUrgent: false,
    isOverdue: false,
    coordinates: { lat: 23.23402, lng: 72.50041 },
    address: "Ward 4 - Main St Service Lane",
    createdAt: "2026-10-03T08:20:00Z",
    age: "2d old",
    citizenReport: {
      photoUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=700&auto=format&fit=crop&q=80",
      originalTranscript: "ખાડો નાનો હતો પણ હવે મોટો થઈ રહ્યો છે.",
      originalLanguage: "Gujarati",
      englishMeaning: "Pothole was small but was widening under vehicular load.",
    },
    aiAnalysis: {
      detectedCategory: "Minor Road Pothole",
      confidenceScore: 91.5,
      priority: "Standard",
      assignedDept: "Roads & Civil Works Division",
      reasoning: "Cold mix bituminous patch completed with compaction.",
    },
    history: [
      { status: "Received", time: "Oct 3, 08:20 AM", note: "Citizen reported via web" },
      { status: "Processing", time: "Oct 3, 02:00 PM", note: "Road squad patched surface" },
      { status: "Completed", time: "Oct 4, 11:30 AM", note: "Inspection verified level surface" },
    ],
  },
  "CIGA-551982-101": {
    id: "CIGA-551982-101",
    title: "Market Water Main Seepage",
    category: "water leak",
    status: "pending",
    isUrgent: true,
    isOverdue: true,
    coordinates: { lat: 23.238910, lng: 72.505412 },
    address: "Market Square North Gate",
    createdAt: "2026-10-04T10:00:00Z",
    age: "1d old",
    citizenReport: {
      photoUrl: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=700&auto=format&fit=crop&q=80",
      originalTranscript: "मार्केट में पानी बह रहा है, दुकानों के आगे कीचड़ हो गया है।",
      originalLanguage: "Hindi",
      englishMeaning: "Water is flooding inside the market area, creating mud in front of shops.",
    },
    aiAnalysis: {
      detectedCategory: "Commercial Zone Pipeline Burst",
      confidenceScore: 97.4,
      priority: "Critical (SLA: 12h)",
      assignedDept: "Municipal Water Supply Board",
      reasoning: "Heavy leakage in high footfall commercial zone with water wastage.",
    },
    history: [
      { status: "Received", time: "Oct 4, 10:00 AM", note: "Reported by shopkeepers" },
      { status: "Overdue", time: "Oct 5, 10:00 AM", note: "Resolution SLA exceeded 12h window" },
    ],
  },
  "CIGA-441829-221": {
    id: "CIGA-441829-221",
    title: "Metro Gate 2 Streetlight Dark",
    category: "streetlight",
    status: "processing",
    isUrgent: false,
    isOverdue: false,
    coordinates: { lat: 23.229870, lng: 72.495120 },
    address: "Metro Station Exit Gate 2 Pedestrian Walk",
    createdAt: "2026-10-05T08:30:00Z",
    age: "6h old",
    citizenReport: {
      photoUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700&auto=format&fit=crop&q=80",
      originalTranscript: "मेट्रो स्टेशन के बाहर लाइटें बंद हैं, रात को बहुत अंधेरा रहता है।",
      originalLanguage: "Hindi",
      englishMeaning: "Lights are off outside the metro station, it is pitch dark at night.",
    },
    aiAnalysis: {
      detectedCategory: "Transit Corridor Street Lighting Failure",
      confidenceScore: 95.1,
      priority: "High",
      assignedDept: "Electrical & Street Lighting Squad",
      reasoning: "High commuter traffic area with failed feeder circuit.",
    },
    history: [
      { status: "Received", time: "Oct 5, 08:30 AM", note: "Reported by daily commuter" },
      { status: "Processing", time: "Oct 5, 11:00 AM", note: "Feeder cable inspection ongoing" },
    ],
  },
  "CIGA-331702-774": {
    id: "CIGA-331702-774",
    title: "Civil Lines Drain Overflow",
    category: "drain",
    status: "pending",
    isUrgent: true,
    isOverdue: false,
    coordinates: { lat: 23.241500, lng: 72.512200 },
    address: "Civil Lines Main Circle",
    createdAt: "2026-10-05T02:00:00Z",
    age: "12h old",
    citizenReport: {
      photoUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb18f156f?w=700&auto=format&fit=crop&q=80",
      originalTranscript: "નાળું ભરાઈ ગયું છે અને ગંદુ પાણી રોડ પર આવી રહ્યું છે.",
      originalLanguage: "Gujarati",
      englishMeaning: "Drain is choked and contaminated water is spilling out onto the main road.",
    },
    aiAnalysis: {
      detectedCategory: "Stormwater Drain Choke & Backflow",
      confidenceScore: 92.9,
      priority: "High (SLA: 24h)",
      assignedDept: "Drainage & Sewerage Network",
      reasoning: "Solid waste blockage causing foul water accumulation on road.",
    },
    history: [
      { status: "Received", time: "Oct 5, 02:00 AM", note: "Night report registered" },
      { status: "AI Triaged", time: "Oct 5, 02:01 AM", note: "Emergency squad alerted" },
    ],
  },
  "CIGA-221601-998": {
    id: "CIGA-221601-998",
    title: "Heritage Colony Asphalt Sinkhole",
    category: "pothole",
    status: "processing",
    isUrgent: false,
    isOverdue: false,
    coordinates: { lat: 23.225100, lng: 72.489300 },
    address: "Heritage Colony Gate 1 Main Approach",
    createdAt: "2026-10-03T16:15:00Z",
    age: "2d old",
    citizenReport: {
      photoUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=700&auto=format&fit=crop&q=80",
      originalTranscript: "કોલોનીના મુખ્ય દરવાજા પાસે રસ્તો બેસી ગયો છે.",
      originalLanguage: "Gujarati",
      englishMeaning: "Road has sunk near the main gate of the colony.",
    },
    aiAnalysis: {
      detectedCategory: "Sub-base Settlement / Sinkhole",
      confidenceScore: 94.6,
      priority: "Medium",
      assignedDept: "Roads & Civil Works Division",
      reasoning: "Gradual road settlement requiring stone soling and premix carpeting.",
    },
    history: [
      { status: "Received", time: "Oct 3, 04:15 PM", note: "Reported with GPS tag" },
      { status: "Processing", time: "Oct 4, 10:00 AM", note: "Survey completed, repair scheduled" },
    ],
  },
};

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const grievance = DETAILED_GRIEVANCES[id];

    if (!grievance) {
      // Dynamic fallback for newly simulated live complaints
      return NextResponse.json({
        success: true,
        data: {
          id,
          title: "Infrastructure Incident Report",
          category: "water leak",
          status: "pending",
          isUrgent: true,
          isOverdue: false,
          coordinates: { lat: 23.234158, lng: 72.500038 },
          address: "Ward 4 - Verified Field Location",
          createdAt: new Date().toISOString(),
          age: "Just now",
          citizenReport: {
            photoUrl: "https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=700&auto=format&fit=crop&q=80",
            originalTranscript: "અહીં સમસ્યા છે, કૃપા કરીને ઝડપથી સમારકામ કરો.",
            originalLanguage: "Gujarati",
            englishMeaning: "There is an infrastructure issue here, please repair quickly.",
          },
          aiAnalysis: {
            detectedCategory: "Urgent Infrastructure Repair",
            confidenceScore: 97.2,
            priority: "High (SLA: 24h)",
            assignedDept: "Ward Rapid Response Squad",
            reasoning: "Automated citizen incident classification confirmed by GPS telemetry.",
          },
          history: [
            { status: "Received", time: "Just now", note: "Received via citizen reporting portal" },
            { status: "AI Triaged", time: "Just now", note: "Categorized and prioritized" },
          ],
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: grievance,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
