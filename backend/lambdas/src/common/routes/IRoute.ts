import {API} from 'lambda-api';

export interface IRoute {
  routes(): (api: API) => void;
}
