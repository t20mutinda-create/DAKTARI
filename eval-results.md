# Daktari evaluation

- Photos checked: 20 of 20
- Exact match with vet label: 10 (50%)
- Same or safer than vet label: 13 (65%)
- Emergencies missed: 7 of 10
- False alarms: 0

| Photo | Vet label | Daktari | SAM / model measurement |
|---|---|---|---|
| lsd-01.jpg | isolate_and_report | vet_visit | 0 SAM regions, model estimate 65% affected |
| udder-01.jpg | vet_visit | vet_visit | 2 SAM regions, model estimate 1% affected |
| healthy-01.jpg | monitor | monitor | 0 SAM regions |
| lsd-02.jpg | isolate_and_report | vet_visit | 0 SAM regions |
| lsd-03.jpg | vet_visit | vet_visit | 0 SAM regions |
| lsd-04.jpg | monitor | vet_visit | 0 SAM regions |
| lsd-05.jpg | isolate_and_report | isolate_and_report | 0 SAM regions, model estimate 20% affected |
| lsd-06.jpg | isolate_and_report | monitor | SAM not run |
| lsd-07.jpg | isolate_and_report | isolate_and_report | 1 SAM region, model estimate 5% affected |
| lsd-08.jpg | vet_visit | vet_visit | 0 SAM regions, model estimate 35% affected |
| lsd-09.jpg | isolate_and_report | vet_visit | 1 SAM region |
| lsd-10.jpg | isolate_and_report | monitor | SAM not run |
| lsd-11.jpg | isolate_and_report | isolate_and_report | 2 SAM regions, model estimate 5% affected |
| lsd-12.jpg | isolate_and_report | vet_visit | 0 SAM regions |
| udder-02.jpg | vet_visit | vet_visit | 0 SAM regions |
| udder-03.jpg | isolate_and_report | vet_visit | 0 SAM regions |
| healthy-02.jpg | monitor | monitor | 0 SAM regions |
| healthy-03.jpg | vet_visit | vet_visit | SAM not run |
| healthy-04.jpg | monitor | vet_visit | SAM not run |
| healthy-05.jpg | monitor | vet_visit | 0 SAM regions |

Affected-percent values are model estimates, not SAM measurements.
