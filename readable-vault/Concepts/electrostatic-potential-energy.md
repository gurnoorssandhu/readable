---
type: concept
title: Electrostatic Potential Energy of a Charge Distribution
created: '2026-04-16'
sources:
  - Purcell_Electricity-and-Magnetism-3rd-Edition
tags:
  - electrostatics
  - potential-energy
  - crystal-lattice
  - coulombs-law
---
The total electrostatic potential energy of a system of $N$ point charges is:

$$U = \frac{1}{2}\sum_{j=1}^{N}\sum_{k \neq j} \frac{1}{4\pi\epsilon_0}\frac{q_j q_k}{r_{jk}}$$

The factor of $\frac{1}{2}$ corrects for double-counting: the double sum counts each pair $(j,k)$ twice (once as $(j,k)$ and once as $(k,j)$), but the physical interaction energy between any two charges exists only once. For example, with 3 charges the double sum yields 6 terms, but there are only 3 unique pairs.

From [[purcellelectricity-and-magnetism-3rd-edition]] (Ch. 1, Eq. 1.16–1.17): Purcell applies this formula to the NaCl crystal lattice by summing the Coulomb interactions of a central ion with all surrounding shells of ions, then multiplying by $N/2$ to obtain the total lattice energy $U$. The result is negative, confirming that the crystal is electrostatically bound — energy must be supplied to disassemble it.

Related: [[coulombs-law]], [[electric-charge]]

## Backlinks
- [[9b6b79ce-6528-4104-ba84-dfaec8a3d1ee]]: Discussed in session on Purcell_Electricity-and-Magnetism-3rd-Edition
