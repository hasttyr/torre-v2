// Canary for tools/depcruise-canary.test.mjs: every import below breaks a rule of
// ARCHITECTURE.md §5, so dependency-cruiser must reject this file.
import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { rule } from '../../rules/src/index.ts';

export const canary = [Injectable, readFileSync, rule];
