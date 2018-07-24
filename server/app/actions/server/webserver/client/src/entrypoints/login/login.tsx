import { Login } from '../../../../../../../../../shared/components/entrypoints/login/login';
import { hydrate } from 'react-dom';
import * as React from 'react';

hydrate(<Login />, document.getElementById('app')!);