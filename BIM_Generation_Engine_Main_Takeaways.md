# BIM Generation Engine — Main Takeaways

## Core Principle

Do not model BIM as geometry.

Model BIM as a **semantic graph** from which geometry, IFC, quantities, analysis models, and documentation can be generated.

```text
Minimal Semantic Input
        ↓
Canonical BIM Graph
        ↓
Rules / Assemblies / Constraints
        ↓
Geometry Generation
        ↓
Information Enrichment
        ↓
Validation
        ↓
IFC 4.3 Export
```

## Relevant Standards

### Primary Standards

| Standard | Purpose |
|-----------|----------|
| ISO 19650-1 | BIM information management principles |
| ISO 19650-2 | Delivery phase information management |
| ISO 19650-3 | Operational phase information management |
| ISO 19650-5 | Security-minded BIM |
| ISO 7817 | Level of Information Need (LOIN) |
| ISO 16739 | IFC data model and exchange format |

### Supporting Standards

| Standard | Purpose |
|-----------|----------|
| ISO 23386 | Data dictionaries |
| ISO 23387 | Data templates |
| ISO 12006-2 | Classification systems |
| ISO 12006-3 | Construction information frameworks |
| ISO 29481 | Information Delivery Manuals (IDM) |
| ISO 21597 | Linked information containers (ICDD) |

## Required Semantic Model

Every generated object should contain:

- GlobalId
- Class
- Type
- Name
- Description
- Placement
- Geometry
- Relationships
- Materials
- Properties
- Quantities
- Classification
- Provenance
- Constraints

## Geometry Layer

Represent geometry separately from semantics.

Prefer:

- WallType
- Placement
- Path / Axis
- Height
- Openings
- Assembly

Store:

- Storeys
- Spaces
- Adjacencies
- Coordinate systems
- Openings
- Voids
- Hosts

## Type vs Instance

### Type

Shared information:

- Assembly
- FireRating
- AcousticRating
- ThermalProperties

### Instance

Physical occurrence:

- Placement
- Length
- Height
- Openings
- Overrides

## Material Assemblies

Assemblies should be first-class objects.

Include:

- Layer ordering
- Structural role
- Thermal role
- Finish role
- Directionality
- Junction behaviour

## Relationships

Support at minimum:

- Contains
- ContainedIn
- Aggregates
- ConnectsTo
- Voids
- Fills
- References
- AdjacentTo

## Openings

Represent as semantic objects:

Wall → Opening → Window

Store:

- Host element
- Opening geometry
- Filling element
- Sill information
- Head information
- Jamb information

## Properties

### Intrinsic Properties

- Density
- Thermal conductivity
- Fire rating
- Acoustic rating
- Strength

### Derived Quantities

- Area
- Volume
- Length
- Perimeter
- Mass

### Project Properties

- Phase
- Status
- Cost code
- Discipline
- Specification

## Property Provenance

Recommended schema:

- Value
- Unit
- Source
- Confidence

## Provenance and Traceability

Every generated value should be traceable:

Input → Rule → Generated Result

## Classification

Support external classification references:

- Uniclass
- OmniClass
- Uniformat
- MasterFormat
- National classifications

## Junction Rules

Treat junctions as a dedicated rule system.

Examples:

- Wall-to-wall
- Wall-to-slab
- Wall-to-roof
- Wall-to-window
- Wall-to-door
- Penetrations

## Coordinate Systems

Support:

- Local coordinates
- Building coordinates
- Site coordinates
- Georeferencing
- Datums
- Units
- Precision tolerances

## Level of Information Need (LOIN)

### Concept Design

- Coarse geometry
- Generic materials
- Minimal properties

### Developed Design

- Accurate geometry
- Defined assemblies
- Engineering properties

### Construction

- Manufacturer data
- Product IDs
- Detailed quantities

### Operations

- Asset IDs
- Maintenance information
- Lifecycle information

## Validation

- Topology validation
- Geometry validation
- Semantic validation
- Information validation
- IFC schema validation

## Recommended Internal Core Schema

Project → Site → Building → Storey → Space / Element

Element contains:

- Type
- Geometry
- Placement
- Materials
- Properties
- Quantities
- Classification
- Relationships
- Provenance
- Constraints

Supporting libraries:

- Material
- Assembly
- PropertyDefinition
- TypeDefinition
- Rule
- JunctionRule
- ClassificationReference
- ValidationRule

## Most Important Design Decision

Keep the **canonical semantic model** independent of IFC.

```text
Semantic Model ≠ IFC

Semantic Model → IFC
Semantic Model → Revit
Semantic Model → Speckle
Semantic Model → Analysis Models
Semantic Model → Digital Twin Systems
```
