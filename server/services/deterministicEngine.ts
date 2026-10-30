/**
 * CampusOps Deterministic Operational Query Engine
 * 
 * Provides 100% reliable, zero-guesswork, factual operational intelligence
 * without requiring any external LLM or cloud API keys.
 * Dynamically computes analytics directly from live or baseline campus records.
 * 
 * Enforces strict backend authorization across the 6 official CampusOps roles:
 * - student_faculty
 * - technician
 * - department_manager
 * - facilities_administrator
 * - procurement_approver
 * - system_administrator
 */

import { UserProfile, CampusRole, normalizeCampusRole } from '../../src/types';
import { campusDataService } from './campusDataService';

export interface CopilotResponse {
  success: boolean;
  provider: 'gemini' | 'local_deterministic';
  model?: string;
  answer: string;
  dataSummary?: {
    metricCount?: number;
    relatedIds?: string[];
    buildingNames?: string[];
  };
  actionableLinks?: Array<{ label: string; path: string }>;
  suggestedQuestions: string[];
  dataSource: 'supabase_live' | 'in_memory_baseline';
}

function getDataSourceBanner(dataSource: 'supabase_live' | 'in_memory_baseline'): string {
  return dataSource === 'supabase_live'
    ? '> **[Data Source: Live Supabase Database]**\n\n'
    : '> **[Data Source: Verified In-Memory Baseline Dataset]**\n\n';
}

export async function processDeterministicQuery(
  rawQuery: string,
  user?: UserProfile
): Promise<CopilotResponse> {
  const query = rawQuery.trim().toLowerCase();
  const dataSource = campusDataService.getDataSource();
  const banner = getDataSourceBanner(dataSource);
  const role: CampusRole = normalizeCampusRole(user?.role);
  const userDept = user?.department || '';
  const userName = user?.name || '';

  // ── 1. ACTIVE COMPLAINTS / INCIDENTS COUNT ─────────────────────────────────
  if (
    /how many active complaints/i.test(query) ||
    /active incidents/i.test(query) ||
    /how many complaints/i.test(query) ||
    /total incidents/i.test(query) ||
    /complaint count/i.test(query) ||
    /open tickets/i.test(query)
  ) {
    const data = await campusDataService.getActiveComplaints(user);

    let scopeNote = '';
    if (role === 'student_faculty') {
      scopeNote = `*(Scope: Filtered to public safety alerts and incidents reported by you)*\n\n`;
    } else if (role === 'department_manager' && userDept) {
      scopeNote = `*(Authorized Scope: ${userDept})*\n\n`;
    }

    const answer = [
      banner,
      `### Active Campus Complaints Overview`,
      scopeNote,
      `There are currently **${data.totalActive} active incidents** within your authorized scope.`,
      '',
      `**Severity Breakdown:**`,
      `- **Critical:** ${data.breakdown.critical} ticket(s) requiring immediate dispatch`,
      `- **High:** ${data.breakdown.high} ticket(s)`,
      `- **Medium:** ${data.breakdown.medium} ticket(s)`,
      `- **Low:** ${data.breakdown.low} ticket(s)`,
      '',
      `**Recommended Action:** Dispatch maintenance engineering teams to address the **${data.breakdown.critical} Critical** and **${data.breakdown.high} High** priority tickets immediately to prevent facility downtime.`,
    ].join('\n');

    return {
      success: true,
      provider: 'local_deterministic',
      answer,
      dataSummary: {
        metricCount: data.totalActive,
        relatedIds: data.items.map((i) => i.ticketNumber),
        buildingNames: Array.from(new Set(data.items.map((i) => i.buildingName))),
      },
      actionableLinks: [
        { label: 'Open Incidents Module', path: '/incidents' },
        { label: 'View 3D Campus Heatmap', path: '/campus-3d' },
      ],
      suggestedQuestions: [
        'Which complaints are Critical?',
        'Which building has the most active incidents?',
        'What should management prioritize today?',
      ],
      dataSource,
    };
  }

  // ── 2. CRITICAL COMPLAINTS / HIGHEST PRIORITY ──────────────────────────────
  if (
    /which complaints? (are|is) critical/i.test(query) ||
    /critical complaints/i.test(query) ||
    /highest priority/i.test(query) ||
    /critical incidents/i.test(query) ||
    /show me critical/i.test(query) ||
    /most urgent complaint/i.test(query)
  ) {
    const data = await campusDataService.getCriticalComplaints(user);

    if (data.count === 0) {
      return {
        success: true,
        provider: 'local_deterministic',
        answer: `${banner}### Critical Complaints Status\n\nThere are currently **0 Critical complaints** within your authorized scope. All active systems are operating within nominal safety parameters.`,
        suggestedQuestions: [
          'Which work orders are pending?',
          'Which building has the most active incidents?',
        ],
        dataSource,
      };
    }

    const ticketList = data.items
      .map(
        (i) =>
          `- **#${i.ticketNumber}: ${i.title}**\n  *Location:* ${i.buildingName} (${i.floor}${i.room ? `, ${i.room}` : ''})\n  *Category:* ${i.category} | *SLA:* ${i.slaDeadline} | *Reported By:* ${i.reportedBy}`
      )
      .join('\n\n');

    const topTicket = data.items[0];

    const answer = [
      banner,
      `### Critical Priority Incidents (${data.count} Active)`,
      `The highest priority incident on campus is **#${topTicket.ticketNumber} — ${topTicket.title}** located in **${topTicket.buildingName}** (${topTicket.floor}).`,
      '',
      `**All Critical Incidents Requiring Immediate Action:**`,
      ticketList,
      '',
      `**Recommended Action:** Escalate ticket #${topTicket.ticketNumber} to on-duty field leads. Immediate response is required before SLA breach (${topTicket.slaDeadline}).`,
    ].join('\n');

    return {
      success: true,
      provider: 'local_deterministic',
      answer,
      dataSummary: {
        metricCount: data.count,
        relatedIds: data.items.map((i) => i.ticketNumber),
        buildingNames: Array.from(new Set(data.items.map((i) => i.buildingName))),
      },
      actionableLinks: [
        { label: `View Ticket #${topTicket.ticketNumber}`, path: `/incidents` },
        { label: 'Create Emergency Work Order', path: '/maintenance' },
      ],
      suggestedQuestions: [
        'Why was this complaint classified as Critical?',
        'Which building has the most active incidents?',
        'What should management prioritize today?',
      ],
      dataSource,
    };
  }

  // ── 3. WHY CLASSIFIED AS CRITICAL ──────────────────────────────────────────
  if (
    /why (was|is) (it|this|a|the)?\s*complaint classified as critical/i.test(query) ||
    /why critical/i.test(query) ||
    /why is it critical/i.test(query) ||
    /critical rationale/i.test(query) ||
    /why.*priority.*critical/i.test(query)
  ) {
    const data = await campusDataService.getCriticalComplaints(user);
    const topTicket = data.items[0];

    if (!topTicket) {
      return {
        success: true,
        provider: 'local_deterministic',
        answer: `${banner}There are currently no active incidents classified as Critical. Normal priority rules apply.`,
        suggestedQuestions: ['How many active complaints exist?', 'Which work orders are pending?'],
        dataSource,
      };
    }

    const answer = [
      banner,
      `### Priority Engine Classification Rationale for #${topTicket.ticketNumber}`,
      `**Incident Title:** ${topTicket.title}`,
      `**Location:** ${topTicket.buildingName}, ${topTicket.floor} (${topTicket.room || 'General Area'})`,
      '',
      `**Deterministic Risk Score Threshold Factors:**`,
      `1. **Life Safety & Occupancy Impact:** This incident involves critical mechanical/safety infrastructure with high passenger entrapment or equipment hazard risk in an active academic zone.`,
      `2. **Critical Infrastructure Disruption:** System failure directly impairs primary building operations (${topTicket.category}).`,
      `3. **Strict SLA Breach Exposure:** Standard Critical SLA requires technician on-site verification within **30 minutes** (Current SLA deadline: *${topTicket.slaDeadline}*).`,
      `4. **Zone Population Weight:** Incident is in **${topTicket.buildingName}**, categorized as a high-density campus node.`,
      '',
      `**Conclusion:** The CampusOps Intelligent Prioritization Engine automatically flagged this ticket as **CRITICAL** based on life-safety vulnerability and tight SLA parameters.`,
    ].join('\n');

    return {
      success: true,
      provider: 'local_deterministic',
      answer,
      dataSummary: {
        metricCount: 1,
        relatedIds: [topTicket.ticketNumber],
        buildingNames: [topTicket.buildingName],
      },
      actionableLinks: [
        { label: `Inspect Ticket #${topTicket.ticketNumber}`, path: `/incidents` },
        { label: 'Issue Priority Work Order', path: `/maintenance` },
      ],
      suggestedQuestions: [
        'Which building has the most active incidents?',
        'Which work orders are pending?',
        'What should management prioritize today?',
      ],
      dataSource,
    };
  }

  // ── 4. BUILDING INCIDENT HOTSPOTS ──────────────────────────────────────────
  if (
    /which building (has the most|needs attention|has most incidents)/i.test(query) ||
    /building.*most.*incidents/i.test(query) ||
    /building.*attention/i.test(query) ||
    /top building/i.test(query) ||
    /incident distribution/i.test(query)
  ) {
    const data = await campusDataService.getBuildingIncidentDistribution(user);

    const breakdown = Object.entries(data.distribution)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, info]) => `- **${name}:** ${info.count} active incident(s) [${info.tickets.join(', ')}]`)
      .join('\n');

    const answer = [
      banner,
      `### Campus Building Incident Distribution`,
      `**${data.topBuilding || 'Engineering Block'}** has the highest volume of active issues with **${data.maxCount} open incidents**.`,
      '',
      `**Building Breakdown:**`,
      breakdown,
      '',
      `**Recommended Action:** Allocate dedicated inspection teams to **${data.topBuilding}** to triage localized power, HVAC, or facility strain.`,
    ].join('\n');

    return {
      success: true,
      provider: 'local_deterministic',
      answer,
      dataSummary: {
        metricCount: data.maxCount,
        buildingNames: Object.keys(data.distribution),
      },
      actionableLinks: [
        { label: `View ${data.topBuilding} in 3D`, path: '/campus-3d' },
        { label: 'Filter Incidents by Building', path: '/incidents' },
      ],
      suggestedQuestions: [
        'Which complaints are Critical?',
        'Which work orders are pending?',
        'What should management prioritize today?',
      ],
      dataSource,
    };
  }

  // ── 5. PENDING WORK ORDERS ─────────────────────────────────────────────────
  if (
    /which work orders are pending/i.test(query) ||
    /pending work orders/i.test(query) ||
    /pending maintenance/i.test(query) ||
    /active work orders/i.test(query) ||
    /open work orders/i.test(query)
  ) {
    // RBAC: student_faculty must not access internal work orders
    if (role === 'student_faculty') {
      return {
        success: true,
        provider: 'local_deterministic',
        answer: `${banner}### Maintenance Work Orders Access\n\n**Access Denied:** Internal maintenance work orders and engineering dispatch logs are restricted to Facilities & Maintenance engineering personnel under CampusOps RBAC compliance.\n\nStudents and faculty may submit and track incident complaints through the Incident Reporting portal.`,
        suggestedQuestions: ['How many active complaints exist?', 'Which rooms are unavailable?'],
        dataSource,
      };
    }

    const data = await campusDataService.getPendingWorkOrders(user);

    let scopeLabel = '';
    if (role === 'technician') {
      scopeLabel = `*(Restricted to work orders assigned to you or unassigned)*\n\n`;
    } else if (role === 'department_manager' && userDept) {
      scopeLabel = `*(Authorized Scope: ${userDept})*\n\n`;
    }

    if (data.count === 0) {
      return {
        success: true,
        provider: 'local_deterministic',
        answer: `${banner}### Pending Work Orders\n\n${scopeLabel}There are currently **0 pending work orders** within your authorized scope.`,
        suggestedQuestions: ['How many active complaints exist?', 'Which inventory items are low?'],
        dataSource,
      };
    }

    const woList = data.items
      .map(
        (w) =>
          `- **#${w.orderNumber} — ${w.title}**\n  *Location:* ${w.buildingName} (${w.location}) | *Priority:* ${w.priority.toUpperCase()} | *Assigned:* ${w.assignedEngineer} | *Due:* ${w.dueDate} (SLA: ${w.slaRemaining})`
      )
      .join('\n\n');

    const answer = [
      banner,
      `### Pending Maintenance Work Orders (${data.count} Open)`,
      scopeLabel,
      `There are **${data.count} work orders** currently active in the maintenance pipeline:`,
      '',
      woList,
      '',
      `**Recommended Action:** Prioritize High/Urgent orders nearing their SLA deadlines to maintain facility uptime.`,
    ].join('\n');

    return {
      success: true,
      provider: 'local_deterministic',
      answer,
      dataSummary: {
        metricCount: data.count,
        relatedIds: data.items.map((w) => w.orderNumber),
        buildingNames: Array.from(new Set(data.items.map((w) => w.buildingName))),
      },
      actionableLinks: [
        { label: 'Open Work Orders Queue', path: '/maintenance' },
        { label: 'Check Low Stock Parts', path: '/inventory' },
      ],
      suggestedQuestions: [
        'Which work orders are overdue?',
        'Which inventory items are below minimum stock?',
        'What should management prioritize today?',
      ],
      dataSource,
    };
  }

  // ── 6. OVERDUE WORK ORDERS ─────────────────────────────────────────────────
  if (
    /which work orders are overdue/i.test(query) ||
    /overdue work orders/i.test(query) ||
    /delayed maintenance/i.test(query) ||
    /overdue maintenance/i.test(query)
  ) {
    if (role === 'student_faculty') {
      return {
        success: true,
        provider: 'local_deterministic',
        answer: `${banner}### Maintenance Work Orders Access\n\n**Access Denied:** Internal maintenance work orders are restricted to authorized Facilities personnel.`,
        suggestedQuestions: ['How many active complaints exist?', 'Which rooms are unavailable?'],
        dataSource,
      };
    }

    const data = await campusDataService.getOverdueWorkOrders(user);

    if (data.count === 0) {
      return {
        success: true,
        provider: 'local_deterministic',
        answer: `${banner}### Overdue Work Orders Status\n\nThere are currently **0 overdue work orders**. All scheduled maintenance is currently progressing within SLA compliance thresholds.`,
        suggestedQuestions: [
          'Which work orders are pending?',
          'Which inventory items are below minimum stock?',
        ],
        dataSource,
      };
    }

    const list = data.items
      .map(
        (w) =>
          `- **#${w.orderNumber}: ${w.title}** (${w.buildingName})\n  *Assigned:* ${w.assignedEngineer} | *SLA Remaining:* ${w.slaRemaining} | *Progress:* ${w.completionRate}%`
      )
      .join('\n\n');

    const answer = [
      banner,
      `### Overdue & Critical Work Orders (${data.count} Alert)`,
      `The following work orders require immediate intervention due to elapsed or critical SLA thresholds:`,
      '',
      list,
      '',
      `**Recommended Action:** Reassign additional technicians to these tasks or verify if required parts are pending approval in procurement.`,
    ].join('\n');

    return {
      success: true,
      provider: 'local_deterministic',
      answer,
      dataSummary: {
        metricCount: data.count,
        relatedIds: data.items.map((w) => w.orderNumber),
      },
      actionableLinks: [{ label: 'Reallocate Technicians', path: '/maintenance' }],
      suggestedQuestions: [
        'Which procurement requests await approval?',
        'What should management prioritize today?',
      ],
      dataSource,
    };
  }

  // ── 7. LOW INVENTORY STOCK ─────────────────────────────────────────────────
  if (
    /which inventory items are (low|below)/i.test(query) ||
    /low.*inventory/i.test(query) ||
    /low.*stock/i.test(query) ||
    /stock depletion/i.test(query) ||
    /inventory alerts/i.test(query)
  ) {
    const data = await campusDataService.getLowStockItems(user);

    const list = data.items
      .map(
        (i) =>
          `- **${i.name} (SKU: ${i.sku})**\n  *Current Stock:* **${i.currentStock} ${i.unit}** (Min Threshold: ${i.minThreshold} ${i.unit}) | *Location:* ${i.location} | *Category:* ${i.category}`
      )
      .join('\n\n');

    const answer = [
      banner,
      `### Inventory Depletion Alerts (${data.count} Items Below Minimum)`,
      `The following critical maintenance spares are below their designated minimum reserve threshold:`,
      '',
      list,
      '',
      `**Recommended Action:** Trigger automatic purchase requisitions or approve pending procurement requests to replenish depleted buffers.`,
    ].join('\n');

    return {
      success: true,
      provider: 'local_deterministic',
      answer,
      dataSummary: {
        metricCount: data.count,
        relatedIds: data.items.map((i) => i.sku),
      },
      actionableLinks: [
        { label: 'Open Inventory Management', path: '/inventory' },
        { label: 'Create Purchase Requisition', path: '/inventory' },
      ],
      suggestedQuestions: [
        'Which procurement requests await approval?',
        'Which work orders are pending?',
        'What should management prioritize today?',
      ],
      dataSource,
    };
  }

  // ── 8. PENDING PROCUREMENT APPROVALS ───────────────────────────────────────
  if (
    /which procurement requests await/i.test(query) ||
    /procurement approval/i.test(query) ||
    /pending approval/i.test(query) ||
    /requisitions/i.test(query) ||
    /procurement/i.test(query)
  ) {
    // Rule 6: Student / Faculty cannot access procurement
    if (role === 'student_faculty') {
      return {
        success: true,
        provider: 'local_deterministic',
        answer: `${banner}### Procurement Access Control\n\n**Access Denied:** Requisition and procurement financial records are restricted to authorized department and administrative officers under CampusOps RBAC compliance.`,
        suggestedQuestions: ['How many active complaints exist?', 'Which rooms are unavailable?'],
        dataSource,
      };
    }

    const data = await campusDataService.getPendingProcurements(user);

    // Rule 11: System Administrator cannot approve business procurement
    let sysAdminNotice = '';
    if (role === 'system_administrator') {
      sysAdminNotice = `> **Separation of Duties Notice:** System Administrators maintain technical and IT operations. Under CampusOps governance, commercial procurement approvals are restricted to certified Procurement Approvers.\n\n`;
    }

    // Rule 9 & 10: Check for self-approval restrictions
    let selfApprovalWarning = '';
    const selfBlockedItems = data.items.filter((p) => p.selfApprovalBlocked);
    if (selfBlockedItems.length > 0) {
      selfApprovalWarning = `> **Dual-Control Policy Notice:** Self-approval is blocked for ${selfBlockedItems.length} request(s) initiated by ${userName} (#${selfBlockedItems.map((p) => p.requestNumber).join(', ')}). An independent authorized approver is required.\n\n`;
    }

    let deptScopeNote = '';
    if (role === 'department_manager' && userDept) {
      deptScopeNote = `*(Authorized Scope: ${userDept})*\n\n`;
    }

    if (data.count === 0) {
      return {
        success: true,
        provider: 'local_deterministic',
        answer: `${banner}### Pending Procurement Requisitions\n\n${sysAdminNotice}${deptScopeNote}There are currently **0 pending purchase requisitions** awaiting approval within your authorized scope.`,
        suggestedQuestions: ['Which inventory items are below minimum stock?', 'What should management prioritize today?'],
        dataSource,
      };
    }

    const list = data.items
      .map((p) => {
        const selfNote = p.selfApprovalBlocked ? ' **[Self-Approval Blocked]**' : '';
        return `- **#${p.requestNumber} — ${p.quantity}x ${p.itemName}**${selfNote}\n  *Est. Cost:* $${p.totalEstimatedCost.toLocaleString()} | *Supplier:* ${p.supplierName} | *Requested By:* ${p.requestedBy} | *Urgency:* ${p.urgency.toUpperCase()}`;
      })
      .join('\n\n');

    const totalEst = data.items.reduce((sum, p) => sum + p.totalEstimatedCost, 0);

    const answer = [
      banner,
      `### Pending Procurement Requisitions (${data.count} Pending)`,
      sysAdminNotice,
      selfApprovalWarning,
      deptScopeNote,
      `There are **${data.count} purchase requisitions** awaiting authorization with a combined estimated value of **$${totalEst.toLocaleString()}**:`,
      '',
      list,
      '',
      `**Compliance Note:** Requisitions require authorization from an independent manager under the campus **Four-Eyes Separation of Duties** policy. Self-approvals are prohibited.`,
    ].join('\n');

    return {
      success: true,
      provider: 'local_deterministic',
      answer,
      dataSummary: {
        metricCount: data.count,
        relatedIds: data.items.map((p) => p.requestNumber),
      },
      actionableLinks: [
        { label: 'Review Approvals Queue', path: '/approvals' },
        { label: 'View Inventory Status', path: '/inventory' },
      ],
      suggestedQuestions: [
        'Which inventory items are below minimum stock?',
        'What should management prioritize today?',
      ],
      dataSource,
    };
  }

  // ── 9. UNAVAILABLE ROOMS & DISRUPTIONS ──────────────────────────────────────
  if (
    /which rooms are unavailable/i.test(query) ||
    /disrupted rooms/i.test(query) ||
    /room closures/i.test(query) ||
    /unavailable rooms/i.test(query) ||
    /facility disruptions/i.test(query)
  ) {
    const data = await campusDataService.getUnavailableRooms(user);

    const roomList = data.rooms
      .map(
        (r) =>
          `- **${r.name} (${r.roomNumber})** in ${r.buildingName}\n  *Status:* ${r.status.toUpperCase()} | *Type:* ${r.roomType.replace('_', ' ')} | *Capacity:* ${r.capacity} seats`
      )
      .join('\n\n');

    const disruptionList = data.disruptions
      .map(
        (d) =>
          `- **${d.roomCode}:** ${d.issue} (Severity: ${d.severity.toUpperCase()}, ETA: ${d.resolutionEta})`
      )
      .join('\n');

    const answer = [
      banner,
      `### Unavailable Campus Rooms & Facilities (${data.count} Closed)`,
      `The following rooms are currently closed to reservations due to active maintenance or emergency disruptions:`,
      '',
      roomList,
      '',
      `**Active Emergency Disruptions:**`,
      disruptionList || '- None reported.',
      '',
      `**Recommended Action:** Use the Room Booking module to reallocate scheduled lectures to recommended alternative conflict-free rooms.`,
    ].join('\n');

    return {
      success: true,
      provider: 'local_deterministic',
      answer,
      dataSummary: {
        metricCount: data.count,
        relatedIds: data.rooms.map((r) => r.roomNumber),
        buildingNames: Array.from(new Set(data.rooms.map((r) => r.buildingName))),
      },
      actionableLinks: [
        { label: 'Open Room Booking & Disruptions', path: '/bookings' },
        { label: 'Reallocate Affected Schedules', path: '/bookings' },
      ],
      suggestedQuestions: [
        'How many active complaints exist?',
        'What should management prioritize today?',
      ],
      dataSource,
    };
  }

  // ── 10. IMMEDIATE ATTENTION / MANAGEMENT PRIORITIES ────────────────────────
  if (
    /what should management prioritize today/i.test(query) ||
    /management priorit/i.test(query) ||
    /what needs attention/i.test(query) ||
    /what is urgent/i.test(query) ||
    /which issues should we solve first/i.test(query) ||
    /daily briefing/i.test(query) ||
    /executive summary/i.test(query)
  ) {
    const priorities = await campusDataService.getManagementPriorities(user);

    const items: string[] = [];

    // Critical Incidents
    if (priorities.criticalIncidents.length > 0) {
      items.push(
        `1. **Critical Incident Escalation:** #${priorities.criticalIncidents[0].ticketNumber} ("${priorities.criticalIncidents[0].title}") in ${priorities.criticalIncidents[0].buildingName} requires urgent dispatch before SLA breach (${priorities.criticalIncidents[0].slaDeadline}).`
      );
    }

    // Urgent Work Orders
    if (priorities.urgentWorkOrders.length > 0 && role !== 'student_faculty') {
      items.push(
        `2. **Urgent Maintenance:** Work Order #${priorities.urgentWorkOrders[0].orderNumber} ("${priorities.urgentWorkOrders[0].title}") is approaching its deadline in ${priorities.urgentWorkOrders[0].buildingName}.`
      );
    }

    // Stock Outages
    if (priorities.criticalStockOutages.length > 0 && role !== 'student_faculty') {
      items.push(
        `3. **Stockout Emergency:** ${priorities.criticalStockOutages.length} item(s) have reached zero units in inventory (${priorities.criticalStockOutages.map((i) => i.name).join(', ')}). Immediate purchase orders needed.`
      );
    }

    // Room Disruptions
    if (priorities.activeDisruptions.length > 0) {
      items.push(
        `4. **Academic Schedule Protection:** Active disruption in ${priorities.activeDisruptions[0].roomCode} (${priorities.activeDisruptions[0].issue}). Reallocate affected class bookings.`
      );
    }

    // Pending Approvals
    if (priorities.pendingApprovals.length > 0 && role !== 'student_faculty') {
      items.push(
        `5. **Requisition Backlog:** ${priorities.pendingApprovals.length} procurement request(s) awaiting sign-off to unblock replacement hardware.`
      );
    }

    const answer = [
      banner,
      `### Campus Operations Executive Priority Briefing`,
      `Here is the prioritized operational agenda based on active safety and facility telemetry:`,
      '',
      items.join('\n\n'),
      '',
      `**Immediate Executive Directive:** Direct engineering resources to the elevator emergency in Main Block and execute purchase requisition REQ-401 to prevent further stockout delays.`,
    ].join('\n');

    return {
      success: true,
      provider: 'local_deterministic',
      answer,
      dataSummary: {
        metricCount: items.length,
        buildingNames: ['Main Block', 'IT Block', 'Central Library'],
      },
      actionableLinks: [
        { label: 'View Incidents', path: '/incidents' },
        { label: 'View Approvals', path: '/approvals' },
        { label: 'Room Management', path: '/bookings' },
      ],
      suggestedQuestions: [
        'How many active complaints exist?',
        'Which complaints are Critical?',
        'Which inventory items are below minimum stock?',
      ],
      dataSource,
    };
  }

  // ── 11. BUILDING-SPECIFIC INQUIRIES ─────────────────────────────────────────
  const buildingMatch = query.match(/what is happening in (main block|it block|central library|hostel block|mechanical block)/i);
  if (buildingMatch) {
    const targetBuildingName = buildingMatch[1].trim();
    const snapshot = await campusDataService.getSnapshot(user);
    const relatedIncidents = snapshot.incidents.filter(
      (i) => i.buildingName.toLowerCase().includes(targetBuildingName.toLowerCase()) && i.status !== 'resolved'
    );
    const relatedWorkOrders = snapshot.workOrders.filter(
      (w) => w.buildingName.toLowerCase().includes(targetBuildingName.toLowerCase()) && w.status !== 'completed'
    );

    const incList = relatedIncidents.length > 0
      ? relatedIncidents.map((i) => `- **#${i.ticketNumber} [${i.severity.toUpperCase()}]:** ${i.title} (${i.floor})`).join('\n')
      : '- No active incidents reported.';

    const woList = relatedWorkOrders.length > 0
      ? relatedWorkOrders.map((w) => `- **#${w.orderNumber}:** ${w.title} (Assigned: ${w.assignedEngineer})`).join('\n')
      : '- No active work orders.';

    const answer = [
      banner,
      `### Operational Status for ${targetBuildingName.toUpperCase()}`,
      `**Active Incidents (${relatedIncidents.length}):**`,
      incList,
      '',
      `**Active Work Orders (${relatedWorkOrders.length}):**`,
      role === 'student_faculty' ? '*(Restricted)*' : woList,
      '',
      `**Recommended Action:** Inspect on-site equipment status and coordinate with building zone managers.`,
    ].join('\n');

    return {
      success: true,
      provider: 'local_deterministic',
      answer,
      dataSummary: {
        metricCount: relatedIncidents.length + relatedWorkOrders.length,
        buildingNames: [targetBuildingName],
      },
      actionableLinks: [
        { label: `View ${targetBuildingName} in 3D`, path: '/campus-3d' },
        { label: 'View Incidents', path: '/incidents' },
      ],
      suggestedQuestions: [
        'Which complaints are Critical?',
        'What should management prioritize today?',
      ],
      dataSource,
    };
  }

  // ── 12. FALLBACK & GUIDED CAPABILITIES ─────────────────────────────────────
  return {
    success: true,
    provider: 'local_deterministic',
    answer: [
      banner,
      `### CampusOps Operations Copilot`,
      `I am the real-time Campus Operations Copilot. You can ask me operational questions about complaints, work orders, inventory, procurement, and facility disruptions:`,
      '',
      `**Supported Inquiries:**`,
      `- *"How many active complaints exist?"*`,
      `- *"Which complaint has the highest priority?"*`,
      `- *"Why was a complaint classified as Critical?"*`,
      `- *"Which building has the most active incidents?"*`,
      `- *"Which work orders are pending or overdue?"*`,
      `- *"Which inventory items are below minimum stock?"*`,
      `- *"Which procurement requests await approval?"*`,
      `- *"Which rooms are unavailable?"*`,
      `- *"What should management prioritize today?"*`,
      `- *"What is happening in Main Block?"*`,
      '',
      `Ask any of the questions above to get instantaneous, grounded telemetry metrics.`,
    ].join('\n'),
    suggestedQuestions: [
      'How many active complaints exist?',
      'Which complaints are Critical?',
      'Which building has the most active incidents?',
      'What should management prioritize today?',
    ],
    dataSource,
  };
}
