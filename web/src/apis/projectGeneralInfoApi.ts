import ApiDirector from './ApiDirector';
import ApiRequestCallBuilder from './apiBuilders/ApiRequestCallBuilder';
import BLApiRequestCallBuilder from './apiBuilders/BLApiRequestCallBuilder';
import { METHODS, validServicesToCall } from './apiBuilders/requestEnums';
import DataProject from 'domain/project/DataProject';
import { plainToClass } from "class-transformer";
import { parseToCamelCase } from 'functions/dataParserHelpers';
import Experiment from 'domain/experiments/Experiment';
import CodeProject from 'domain/project/CodeProject';
import { PROJECT_TYPES } from 'domain/project/projectTypes';
import { handleResponse, handlePagination, inspect } from 'functions/apiCalls';

export default class ProjectGeneralInfoApi extends ApiDirector {
  constructor() {
    super();

    this.listPublicProjects = this.listPublicProjects.bind(this);
    this.getProjectDetails = this.getProjectDetails.bind(this);
    this.getProjectDetailsNoAuth = this.getProjectDetailsNoAuth.bind(this);
  }
  async create(body: any, projectType: string) {
    const baseUrl = `/api/v1/${projectType}s`;
    const apiReqBuilder = new ApiRequestCallBuilder(METHODS.POST, this.buildBasicHeaders(validServicesToCall.BACKEND), baseUrl, JSON.stringify(body));
    const response = await fetch(apiReqBuilder.build());
    if (!response.ok) {
      const body = await response.json();
      return Promise.reject(body.error_message);
    }
    return response;
  }

  async getProjectInfoApi(projectId: number) {
    const url = `/api/v4/projects/${projectId}?statistics=true`;
    const builder = new BLApiRequestCallBuilder(METHODS.GET, this.buildBasicHeaders(validServicesToCall.GITLAB), url);

    const response = await fetch(builder.build());

    if (!response.ok) {
      return Promise.reject(response);
    }
    return response.json();
  }

  async getProjectsList(projectsType: string) {
    const url = `/api/v1/${projectsType}s`;
    const builder = new BLApiRequestCallBuilder(METHODS.GET, this.buildBasicHeaders(validServicesToCall.BACKEND), url);
    const response = fetch(builder.build());
    return response.then(async (res) => {
      if(!res.ok){
        return Promise.reject(res);
      }
      const projectsList = await res.json();
      if(projectsType === PROJECT_TYPES.CODE_PROJ){
        return plainToClass(CodeProject, projectsList.map((p: any) => parseToCamelCase(p)).map((backPro: any) => {
          const newPro = { ...backPro, backendId: backPro.id };
          newPro.projectType = projectsType;
          delete newPro.id;
          return newPro;
        }))
      }
      return plainToClass(DataProject, projectsList.map((p: any) => parseToCamelCase(p)).map((backPro: any) => {
        const newPro = { ...backPro, backendId: backPro.id };
        newPro.experiments = backPro.experiments.map((exp: any) => plainToClass(Experiment, parseToCamelCase(exp)));
        newPro.projectType = projectsType;
        delete newPro.id;
        return newPro;
      }));
    })
  }

  listPublicProjects() {
    const url = '/api/v1/projects/public';

    return fetch(url)
      .then(handleResponse);
  }

  getMembers(projectId: string) {
    const url = `/api/v1/data-projects/${projectId}/users`;
    const headers = this.buildBasicHeaders(validServicesToCall.BACKEND);
    const builder = new BLApiRequestCallBuilder(METHODS.GET, headers, url);

    return fetch(builder.build())
      .then(handleResponse);
  }

  addMember(projectId: string, formData: any) {
    const url = `/api/v1/data-projects/${projectId}/users`;
    const headers = this.buildBasicHeaders(validServicesToCall.BACKEND)
    const builder = new ApiRequestCallBuilder(
      METHODS.POST,
      headers,
      url,
      JSON.stringify(formData)
    );

    return fetch(builder.build())
      .then(handleResponse);
  }

  removeMember(projectId: number, userUuid: string) {
    const url = `/api/v1/data-projects/${projectId}/users/${userUuid}`;
    const headers = this.buildBasicHeaders(validServicesToCall.BACKEND)
    const builder = new BLApiRequestCallBuilder(METHODS.DELETE, headers, url);

    return fetch(builder.build())
      .then(handleResponse);
  }

  updateProjectDetails(projectId: number, body: Object) {
    const url = `/api/v1/data-projects/${projectId}`;
    const data = {...body}
    const headers = this.buildBasicHeaders(validServicesToCall.BACKEND)
    const builder = new ApiRequestCallBuilder(METHODS.PUT, headers, url, JSON.stringify(data));

    return fetch(builder.build())
      .then(handleResponse);
  }

  // updateProjectAvatar(projectId: number, payload: FormData) {
  //   const url = `/api/v4/projects/${projectId}`;
  //   const headers = this.buildBasicHeaders(validServicesToCall.GITLAB);
  //   const builder = new ApiRequestCallBuilder(METHODS.PUT, headers, url, payload);

  //   return fetch(builder.build())
  //     .then(handleResponse);
  // }

  /**
   * @param {*} id: project which will be forked
   * @param {*} namespace: space to fork project to
   * @param {*} name: forked project name
   */
  async forkProject(id: number, namespace: string, name: string) {
    const builder = new ApiRequestCallBuilder(
      METHODS.POST,
      this.buildBasicHeaders(validServicesToCall.GITLAB),
      `/api/v4/projects/${id}/fork`,
      JSON.stringify({
        id, namespace, name,
      })
    );
    return fetch(builder.build());
  }

  removeProject = async (projectId: number) => {
    const bl = new BLApiRequestCallBuilder(
      METHODS.DELETE,
      this.buildBasicHeaders(validServicesToCall.GITLAB),
      `/api/v4/projects/${projectId}`)
    return fetch(bl.build())
  };

  async getProjectContributors(projectId: number) {
    const url = `/api/v4/projects/${projectId}/members`;
    const builder = new BLApiRequestCallBuilder(METHODS.GET, this.buildBasicHeaders(validServicesToCall.GITLAB), url);
    const response = await fetch(builder.build());

    if (!response.ok) {
      return Promise.reject(response);
    }
    return response;
  }

  async getUsers(projectId: number) {
    const url = `/api/v4/projects/${projectId}/users`;
    // this request must not include authentication
    const response = await fetch(url);
    if (!response.ok) {
      return Promise.reject(response);
    }
    return response.json();
  }

  getProjectDetails(namespace: string, slug: string) {
    const url = `/api/v1/projects/slug/${slug}`;
    const headers = this.buildBasicHeaders(validServicesToCall.BACKEND)
    const builder = new BLApiRequestCallBuilder(METHODS.GET, headers, url);

    return fetch(builder.build())
      .then(handleResponse)
      .then((results) => results.find((res: any) => res.gitlab_namespace === namespace));
  }

  getProjectDetailsNoAuth(namespace: string, slug: string) {
    return this.listPublicProjects()
      .then(handlePagination)
      .then(inspect)
      .then((results) => results
        .filter((res: any) => res.gitlab_namespace === namespace)
        .find((res: any) => res.slug === slug)
      );
  }
}
