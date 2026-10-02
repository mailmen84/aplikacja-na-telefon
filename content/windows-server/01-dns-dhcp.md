---
title: DNS & DHCP (Windows Server)
summary: Install and run the DNS and DHCP roles — zones, records, scopes, reservations, verification
tags: [windows server, dns, dhcp, zone, a record, cname, ptr, scope, reservation, lease, powershell]
order: 1
---

> On a Windows network these two roles usually sit on (or beside) the domain controller: **DNS** resolves names (and AD depends on it), **DHCP** hands out IP addresses. PowerShell as admin; GUI tools are `dnsmgmt.msc` and `dhcpmgmt.msc`.

## 🌐 DNS

### Install the role
```powershell
Install-WindowsFeature DNS -IncludeManagementTools
```
(On a domain controller promoted with `-InstallDns`, DNS is already there and AD-integrated.)

### Zones
A **zone** is the slice of the DNS namespace a server is authoritative for.

```powershell
# forward zone (name → IP). AD-integrated zones replicate with AD automatically:
Add-DnsServerPrimaryZone -Name "home.lan" -ReplicationScope Domain

# reverse zone (IP → name), for PTR lookups:
Add-DnsServerPrimaryZone -NetworkId "192.168.1.0/24" -ReplicationScope Domain

Get-DnsServerZone
```

### Records
```powershell
Add-DnsServerResourceRecordA   -ZoneName "home.lan" -Name "nas"  -IPv4Address 192.168.1.20 -CreatePtr
Add-DnsServerResourceRecordCName -ZoneName "home.lan" -Name "www" -HostNameAlias "nas.home.lan"
Get-DnsServerResourceRecord -ZoneName "home.lan"
Remove-DnsServerResourceRecord -ZoneName "home.lan" -RRType A -Name "nas"
```

| Record | Maps | Example |
|---|---|---|
| **A** / AAAA | name → IPv4 / IPv6 | `nas.home.lan → 192.168.1.20` |
| **PTR** | IP → name (reverse) | `192.168.1.20 → nas.home.lan` |
| **CNAME** | alias → another name | `www → nas.home.lan` |
| **MX** | domain → mail server | |
| **SRV** | service location (AD uses these heavily) | `_ldap._tcp...` |

### Forwarders & testing
```powershell
Set-DnsServerForwarder -IPAddress 1.1.1.1, 8.8.8.8     # where to send names you don't host
Resolve-DnsName nas.home.lan -Server 127.0.0.1         # test locally
Clear-DnsServerCache
```
💡 Set a **forwarder** so the DNS server can resolve the public internet for your clients.

## 📬 DHCP

### Install and authorize
```powershell
Install-WindowsFeature DHCP -IncludeManagementTools
# In AD, a DHCP server must be AUTHORIZED or it won't hand out addresses:
Add-DhcpServerInDC -DnsName "dc1.home.lan" -IPAddress 192.168.1.10
```

### Create a scope (the range it leases)
```powershell
Add-DhcpServerv4Scope -Name "LAN" -StartRange 192.168.1.100 -EndRange 192.168.1.200 `
  -SubnetMask 255.255.255.0 -State Active
Set-DhcpServerv4OptionValue -ScopeId 192.168.1.0 -Router 192.168.1.1 `
  -DnsServer 192.168.1.10 -DnsDomain "home.lan"
```
- **Scope** = the pool of addresses a subnet can lease.
- Reserve the low addresses for static devices (don't include them in the range, or exclude them).

### Reservations (always give a device the same IP)
```powershell
Add-DhcpServerv4Reservation -ScopeId 192.168.1.0 -IPAddress 192.168.1.50 `
  -ClientId "AA-BB-CC-DD-EE-FF" -Name "printer"
```

### Verify
```powershell
Get-DhcpServerv4Scope
Get-DhcpServerv4Lease -ScopeId 192.168.1.0        # who currently has a lease
Get-DhcpServerv4Reservation -ScopeId 192.168.1.0
```
Client side: `ipconfig /release` + `/renew` (see [Windows networking](../windows/01-networking.md)).

## 🩺 Common issues

| Symptom | Likely cause |
|---|---|
| clients get 169.254.x.x (APIPA) | DHCP not reachable/authorized, scope inactive or exhausted |
| name resolution fails after IP works | DNS zone/record missing, or client pointed at the wrong DNS |
| DHCP server hands out nothing | not **authorized** in AD, or the scope is not **Active** |
| wrong gateway/DNS on clients | scope **options** (Router/DnsServer) not set |

💡 On most homelabs the DC, DNS and DHCP all live on one box. Clients should use the **DC's IP as their DNS**, and DHCP should push that DNS + the real gateway as scope options.
